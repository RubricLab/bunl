import { serve, sleep, type ServerWebSocket } from "bun";
import { uid } from "./utils";

type Client = { id: string };

const port = Bun.env.PORT || 1234;
const scheme = Bun.env.SCHEME || "http";
const domain = Bun.env.DOMAIN || `localhost:${port}`;

const clients = new Map<string, ServerWebSocket<Client>>();
const clientData = new Map<string, any>();

serve<Client>({
  port,
  fetch: async (req, server) => {
    const reqUrl = new URL(req.url);

    if (reqUrl.searchParams.has("new")) {
      const requested = reqUrl.searchParams.get("subdomain");
      const id = requested && !clients.has(requested) ? requested : uid();
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
    const { method, url, headers } = req;
    const path = new URL(url).pathname;
    client.send(JSON.stringify({ method, path, headers }));

    // Wait for the client to cache its response above
    await sleep(1);

    let retries = 5;
    let res = clientData.get(subdomain);

    // Poll every second for the client to respond
    // TODO: replace poll with a client-triggered callback
    while (!res) {
      await sleep(1000);
      retries--;

      res = clientData.get(subdomain);

      if (retries < 1) {
        console.log(`\x1b[31m${subdomain} not responding \x1b[0m`);
        return new Response("client not responding :(", { status: 500 });
      }
    }

    return new Response(res);
  },
  websocket: {
    open(ws) {
      console.log("connecting to", ws.data.id);
      clients.set(ws.data.id, ws);
      ws.send(
        JSON.stringify({
          url: `${scheme}://${ws.data.id}.${domain}`,
        })
      );
    },
    message(ws, message) {
      console.log("message from", ws.data.id);
      clientData.set(ws.data.id, message);
    },
    close(ws) {
      console.log("closing", ws.data.id);
      clients.delete(ws.data.id);
    },
  },
});

console.log(`Websocket server up at ws://${domain}`);
