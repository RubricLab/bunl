import { serve, sleep, type ServerWebSocket } from "bun";
import { uid } from "./utils";

type Client = { id: string };

const port = Bun.env.PORT || 1234;
const scheme = Bun.env.SCHEME || "http";
const domain = Bun.env.DOMAIN || `localhost:${port}`;

const clients = new Map<string, ServerWebSocket<Client>>();
const clientData = new Map<string, string>();

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
      return new Response("client not found", { status: 404 });
    }

    // The magic: forward the req to the client
    const client = clients.get(subdomain)!;
    const { method, url, headers: reqHeaders } = req;
    const { pathname } = new URL(url);
    client.send(JSON.stringify({ method, pathname, headers: reqHeaders }));

    // Wait for the client to cache its response above
    await sleep(1);

    let retries = 5;
    let res = clientData.get(`${subdomain}/${pathname}`);

    // Poll every second for the client to respond
    // TODO: replace poll with a client-triggered callback
    while (!res) {
      await sleep(1000);
      retries--;

      res = clientData.get(`${subdomain}/${pathname}`);

      if (retries < 1) {
        return new Response("client not responding", { status: 500 });
      }
    }

    const { status, statusText, headers, body } = JSON.parse(res);
    delete headers["content-encoding"];

    return new Response(body, { status, statusText, headers });
  },
  websocket: {
    open(ws) {
      clients.set(ws.data.id, ws);
      console.log(
        `\x1b[32mconnected to ${ws.data.id} (${clients.size} total)\x1b[0m`
      );
      ws.send(
        JSON.stringify({
          url: `${scheme}://${ws.data.id}.${domain}`,
        })
      );
    },
    message(ws, message: string) {
      console.log("message from", ws.data.id);

      const { pathname } = JSON.parse(message);
      clientData.set(`${ws.data.id}/${pathname}`, message);
    },
    close(ws) {
      console.log("closing", ws.data.id);
      clients.delete(ws.data.id);
    },
  },
});

console.log(`Websocket server up at ws://${domain}`);
