import { parseArgs } from "util";
import browser from "open";
import type { Payload } from "./types";

async function main({
  port,
  domain,
  subdomain,
  open,
}: {
  port?: string;
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

  const url = `http://localhost:${port}`;

  socket.addEventListener("message", async (event) => {
    const data = JSON.parse(event.data as string);

    if (data.url) {
      console.log(`\n↪ Your URL: \x1b[32m${data.url}\x1b[0m\n`);
      if (open) browser(data.url);
    }

    const { method, headers: reqHeaders, pathname, body: reqBody } = data;

    if (method) {
      const now = performance.now();
      const res = await fetch(`${url}${pathname || ""}`, {
        method,
        headers: reqHeaders,
        body: reqBody,
      });

      const elapsed = performance.now() - now;
      console.log(
        `\x1b[32m${method}\x1b[0m ${pathname} in ${elapsed.toFixed(2)}ms`
      );

      const { status, statusText, headers } = res;
      const body = await res.text();

      const payload: Payload = {
        method,
        pathname,
        status,
        statusText,
        headers,
        body,
      };

      socket.send(JSON.stringify(payload));
    }
  });

  socket.addEventListener("open", (event: any) => {
    if (!event.target.readyState) throw "not ready";
  });

  socket.addEventListener("close", () => {
    console.warn("server closed connection");
    process.exit();
  });
}

/**
 * Eg. `bun client.ts -p 3000 -d example.so -s my-subdomain -o`
 * > my-subdomain.example.so will be proxied to localhost:3000
 * See README for full usage.
 */
const { values } = parseArgs({
  args: process.argv,
  options: {
    port: { type: "string", short: "p", default: "3000" },
    domain: { type: "string", short: "d", default: "localhost:1234" },
    subdomain: { type: "string", short: "s" },
    open: { type: "boolean", short: "o" },
    version: { type: "boolean", short: "v" },
  },
  allowPositionals: true,
});

if (values.version) {
  console.log(process.env.npm_package_version);
  process.exit();
}

main(values);
