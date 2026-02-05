import { parseArgs } from "util";
import { openBrowser, toBase64, fromBase64 } from "./utils";
import type { TunnelInit, TunnelRequest, TunnelResponse } from "./types";

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
	const localOrigin = `http://localhost:${port}`;

	socket.addEventListener("message", async (event) => {
		const data = JSON.parse(event.data as string);

		// Initial connection — server tells us our public URL
		if (data.type === "init") {
			const init = data as TunnelInit;
			console.log(`\n↪ Your URL: \x1b[32m${init.url}\x1b[0m\n`);
			if (open) openBrowser(init.url);
			return;
		}

		// Incoming tunnel request — proxy to local server
		if (data.type === "request") {
			const req = data as TunnelRequest;
			const now = performance.now();

			try {
				// Decode base64 request body
				const reqBody =
					req.body && req.method !== "GET" && req.method !== "HEAD"
						? fromBase64(req.body)
						: undefined;

				// Remove headers that would conflict with the local fetch
				const fwdHeaders = { ...req.headers };
				delete fwdHeaders["host"];
				delete fwdHeaders["connection"];
				delete fwdHeaders["transfer-encoding"];

				const res = await fetch(`${localOrigin}${req.pathname}`, {
					method: req.method,
					headers: fwdHeaders,
					body: reqBody,
				});

				const elapsed = (performance.now() - now).toFixed(1);
				console.log(
					`\x1b[32m${req.method}\x1b[0m ${req.pathname} → ${res.status} (${elapsed}ms)`
				);

				// Read response as binary, encode to base64
				const resBody = await res.arrayBuffer();
				const headers: Record<string, string> = {};
				res.headers.forEach((v, k) => {
					headers[k] = v;
				});

				const response: TunnelResponse = {
					type: "response",
					id: req.id,
					status: res.status,
					statusText: res.statusText,
					headers,
					body: toBase64(resBody),
				};

				socket.send(JSON.stringify(response));
			} catch (err) {
				console.error(
					`\x1b[31mERR\x1b[0m ${req.method} ${req.pathname}: ${err}`
				);

				const response: TunnelResponse = {
					type: "response",
					id: req.id,
					status: 502,
					statusText: "Bad Gateway",
					headers: { "content-type": "text/plain" },
					body: toBase64(
						new TextEncoder().encode(
							`Failed to reach localhost:${port} — ${err}`
						)
					),
				};
				socket.send(JSON.stringify(response));
			}
		}
	});

	socket.addEventListener("open", () => {
		console.log(`Connected to ${serverUrl}`);
	});

	socket.addEventListener("close", () => {
		console.warn("Server closed connection");
		process.exit(1);
	});

	socket.addEventListener("error", (err) => {
		console.error("WebSocket error:", err);
		process.exit(1);
	});
}

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
	const pkg = await Bun.file(
		new URL("./package.json", import.meta.url)
	).json();
	console.log(pkg.version);
	process.exit();
}

main(values);
