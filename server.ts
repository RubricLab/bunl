import { serve, type ServerWebSocket } from "bun";
import { uid } from "./utils";
import type { Client, Payload } from "./types";

const port = Bun.env.PORT || 1234;
const scheme = Bun.env.SCHEME || "http";
const domain = Bun.env.DOMAIN || `localhost:${port}`;

const clients = new Map<string, ServerWebSocket<Client>>();
const requesters = new Map<string, WritableStream>();

serve<Client>({
  port,
  fetch: async (req, server) => {
    const reqUrl = new URL(req.url);

    if (reqUrl.searchParams.has("new")) {
      const requested = reqUrl.searchParams.get("subdomain");
      let id = requested || uid();
      if (clients.has(id)) id = uid();

      const upgraded = server.upgrade(req, { data: { id } });
      if (upgraded) return;
      else return new Response("upgrade failed", { status: 500 });
    }

    const subdomain = reqUrl.hostname.split(".")[0];

    if (!clients.has(subdomain)) {
      return new Response(`${subdomain} not found`, { status: 404 });
    }

    // The magic: forward the req to the client
    const client = clients.get(subdomain)!;
    const { method, url, headers: reqHeaders } = req;
    const reqBody = await req.text();
    const pathname = new URL(url).pathname;
    const payload: Payload = {
      method,
      pathname,
      body: reqBody,
      headers: reqHeaders,
    };

    const { writable, readable } = new TransformStream();

    requesters.set(`${method}:${subdomain}${pathname}`, writable);
    client.send(JSON.stringify(payload));

    const res = await readable.getReader().read();
    const { status, statusText, headers, body } = JSON.parse(res.value);

    delete headers["content-encoding"]; // remove problematic header

    return new Response(body, { status, statusText, headers });
  },
  websocket: {
    open(ws) {
      clients.set(ws.data.id, ws);
      console.log(`\x1b[32m+ ${ws.data.id} (${clients.size} total)\x1b[0m`);
      ws.send(
        JSON.stringify({
          url: `${scheme}://${ws.data.id}.${domain}`,
        })
      );
    },
    message: async ({ data: { id } }, message: string) => {
      console.log("message from", id);

      const { method, pathname } = JSON.parse(message) as Payload;
      const writable = requesters.get(`${method}:${id}${pathname}`);
      if (!writable) throw "connection not found";

      if (writable.locked) return;

      const writer = writable.getWriter();
      await writer.write(message);
      await writer.close();
    },
    close({ data }) {
      console.log("closing", data.id);
      clients.delete(data.id);
    },
  },
});

console.log(`websocket server up at ws://${domain}`);
