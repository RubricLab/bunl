import { parseArgs } from "util";

async function main({
  localhost,
  apiHost,
}: {
  localhost: string;
  apiHost?: string;
}) {
  const serverUrl = `ws://${apiHost || "localhost:1234"}?new`;
  const socket = new WebSocket(serverUrl);

  socket.addEventListener("message", (event) => {
    const data = JSON.parse(event.data);
    console.log("message:", data);

    if (data.method) {
      fetch(`${localhost}${data.path}`, {
        method: data.method,
        headers: data.headers,
      })
        .then((res) => res.text())
        .then((res) => {
          socket.send(res);
        });
    }
  });

  socket.addEventListener("open", (event) => {
    console.log("socket ready:", !!(event.target as any).readyState);
    socket.ping();
  });
}

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
      short: "d",
    },
  },
  allowPositionals: true,
});

if (!values.port) throw "pass --port 3000";

main({ localhost: `localhost:${values.port}`, apiHost: values.domain });
