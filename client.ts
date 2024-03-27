import { parseArgs } from "util";
import browser from "open";

async function main({
  url,
  domain,
  subdomain,
  open,
}: {
  url: string;
  domain?: string;
  subdomain?: string;
  open?: boolean;
}) {
  const params = new URLSearchParams({
    new: "",
    ...(subdomain ? { subdomain } : {}),
  }).toString();
  const serverUrl = `ws://${domain}?${params}`;
  const socket = new WebSocket(serverUrl);

  socket.addEventListener("message", async (event) => {
    const data = JSON.parse(event.data as string);
    console.log("message:", data);

    if (open && data.url) browser(data.url);

    if (data.method) {
      const res = await fetch(`${url}${data.pathname}`, {
        method: data.method,
        headers: data.headers,
      });

      const { status, statusText, headers } = res;
      const body = await res.text();

      const serializedRes = JSON.stringify({
        pathname: data.pathname,
        status,
        statusText,
        headers: Object.fromEntries(headers),
        body,
      });

      socket.send(serializedRes);
    }
  });

  socket.addEventListener("open", (event) => {
    if (!event.target.readyState) throw "Not ready";
  });

  socket.addEventListener("close", () => {
    console.log(`\x1b[31mfailed to connect to server\x1b[0m`);
    process.exit();
  });
}

/**
 * Eg. `bun client.ts -p 3000 -d example.so -s my-subdomain -o`
 * > my-subdomain.example.so will be proxied to localhost:3000
 * See README for full usage.
 */
const { values } = parseArgs({
  args: Bun.argv,
  options: {
    port: {
      type: "string",
      required: true,
      short: "p",
    },
    domain: {
      type: "string",
      default: "localhost:1234",
      short: "d",
    },
    subdomain: {
      type: "string",
      short: "s",
    },
    open: {
      type: "boolean",
      short: "o",
    },
  },
  allowPositionals: true,
});

if (!values.port) throw "pass -p 3000";

const { port, domain, subdomain, open } = values;

main({
  url: `localhost:${port}`,
  domain,
  subdomain,
  open,
});
