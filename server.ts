import { type ServerWebSocket, serve } from 'bun'
import type { Client, TunnelInit, TunnelRequest, TunnelResponse } from './types'
import { fromBase64, toBase64, uid } from './utils'

const port = Number(Bun.env.PORT) || 1234
const scheme = Bun.env.SCHEME || 'http'
const domain = Bun.env.DOMAIN || `localhost:${port}`

/** Connected tunnel clients keyed by subdomain */
const clients = new Map<string, ServerWebSocket<Client>>()

/** Pending HTTP requests waiting for a tunnel response, keyed by request ID */
const pending = new Map<
	string,
	{
		resolve: (res: TunnelResponse) => void
		timer: Timer
	}
>()

const TIMEOUT_MS = 30_000

serve<Client>({
	fetch: async (req, server) => {
		const reqUrl = new URL(req.url)

		// Client wants to register a new tunnel
		if (reqUrl.searchParams.has('new')) {
			const requested = reqUrl.searchParams.get('subdomain')
			let id = requested || uid()
			// Avoid collisions — if taken, generate a fresh one
			if (clients.has(id)) id = uid()

			const upgraded = server.upgrade(req, { data: { id } })
			if (upgraded) return undefined
			return new Response('WebSocket upgrade failed', { status: 500 })
		}

		// Public HTTP request — route to the right tunnel client
		const subdomain = reqUrl.hostname.split('.')[0] || ''
		const client = clients.get(subdomain)

		if (!client) {
			return new Response(`Tunnel "${subdomain}" not found`, { status: 404 })
		}

		const id = crypto.randomUUID()
		const { method } = req
		const pathname = reqUrl.pathname + reqUrl.search

		// Read request body as binary and encode to base64
		const rawBody = await req.arrayBuffer()
		const body = rawBody.byteLength > 0 ? toBase64(rawBody) : ''

		// Flatten request headers
		const headers: Record<string, string> = {}
		req.headers.forEach((v, k) => {
			headers[k] = v
		})

		const message: TunnelRequest = {
			body,
			headers,
			id,
			method,
			pathname,
			type: 'request'
		}

		// Create a promise that will be resolved when the client responds
		const response = await new Promise<TunnelResponse>((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id)
				reject(new Error('Tunnel request timed out'))
			}, TIMEOUT_MS)

			pending.set(id, { resolve, timer })
			client.send(JSON.stringify(message))
		}).catch((err: unknown): TunnelResponse => {
			const message = err instanceof Error ? err.message : String(err)
			return {
				body: Buffer.from(message).toString('base64'),
				headers: { 'content-type': 'text/plain' },
				id,
				status: 504,
				statusText: 'Gateway Timeout',
				type: 'response'
			}
		})

		// Decode base64 response body back to binary
		const resBody = response.body ? fromBase64(response.body) : null

		// Build response headers, removing problematic ones
		const resHeaders = { ...response.headers }
		delete resHeaders['content-encoding']
		delete resHeaders['transfer-encoding']
		// Fix content-length to match the actual decoded body
		if (resBody) {
			resHeaders['content-length'] = String(resBody.byteLength)
		}

		return new Response(resBody as Uint8Array<ArrayBuffer> | null, {
			headers: resHeaders,
			status: response.status,
			statusText: response.statusText
		})
	},
	port,
	websocket: {
		close(ws) {
			console.log(`\x1b[31m- ${ws.data.id}\x1b[0m (${clients.size - 1} connected)`)
			clients.delete(ws.data.id)
		},

		message(_ws, raw) {
			const msg = JSON.parse(
				typeof raw === 'string' ? raw : new TextDecoder().decode(raw)
			) as TunnelResponse

			if (msg.type !== 'response' || !msg.id) return

			const entry = pending.get(msg.id)
			if (!entry) return

			clearTimeout(entry.timer)
			pending.delete(msg.id)
			entry.resolve(msg)
		},
		open(ws) {
			clients.set(ws.data.id, ws)
			console.log(`\x1b[32m+ ${ws.data.id}\x1b[0m (${clients.size} connected)`)
			const init: TunnelInit = {
				type: 'init',
				url: `${scheme}://${ws.data.id}.${domain}`
			}
			ws.send(JSON.stringify(init))
		}
	}
})

console.log(`bunl server listening on :${port} (${scheme}://*.${domain})`)
