import { type ServerWebSocket, serve } from 'bun'
import type { Client, TunnelInit, TunnelRequest, TunnelResponse } from './types'
import { fromBase64, page, toBase64, uid } from './utils'

const port = Number(Bun.env.PORT) || 1234
const scheme = Bun.env.SCHEME || 'http'
const domain = Bun.env.DOMAIN || `localhost:${port}`
const domainHost = domain.replace(/:\d+$/, '')

const clients = new Map<string, ServerWebSocket<Client>>()
const pending = new Map<
	string,
	{
		resolve: (res: TunnelResponse) => void
		timer: Timer
	}
>()

const TIMEOUT_MS = 30_000

const landingHtml = page(
	'bunl',
	`<h1>bunl</h1>
<p>Expose localhost to the world.</p>
<p><code>bun x bunl -p 3000</code></p>`
)

function notFoundHtml(subdomain: string) {
	return page(
		'Not Found',
		`<h1>Not Found</h1>
<p>No tunnel is connected for <code>${subdomain}</code>.</p>
<p>Make sure your client is running.</p>`
	)
}

const timeoutHtml = page(
	'Gateway Timeout',
	`<h1>Gateway Timeout</h1>
<p>The tunnel client didn't respond in time.</p>`
)

serve<Client>({
	fetch: async (req, server) => {
		const reqUrl = new URL(req.url)

		if (reqUrl.searchParams.has('new')) {
			const requested = reqUrl.searchParams.get('subdomain')
			let id = requested || uid()
			if (clients.has(id)) id = uid()

			const upgraded = server.upgrade(req, { data: { id } })
			if (upgraded) return undefined
			return new Response('WebSocket upgrade failed', { status: 500 })
		}

		const host = (req.headers.get('host') || reqUrl.hostname).replace(/:\d+$/, '')
		const subdomain = host.endsWith(`.${domainHost}`) ? host.slice(0, -(domainHost.length + 1)) : ''

		if (!subdomain) {
			return new Response(landingHtml, {
				headers: { 'content-type': 'text/html; charset=utf-8' }
			})
		}

		const client = clients.get(subdomain)

		if (!client) {
			return new Response(notFoundHtml(subdomain), {
				headers: { 'content-type': 'text/html; charset=utf-8' },
				status: 404
			})
		}

		const id = crypto.randomUUID()
		const { method } = req
		const pathname = reqUrl.pathname + reqUrl.search

		const rawBody = await req.arrayBuffer()
		const body = rawBody.byteLength > 0 ? toBase64(rawBody) : ''

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

		const response = await new Promise<TunnelResponse>((resolve, reject) => {
			const timer = setTimeout(() => {
				pending.delete(id)
				reject(new Error('Tunnel request timed out'))
			}, TIMEOUT_MS)

			pending.set(id, { resolve, timer })
			client.send(JSON.stringify(message))
		}).catch((): TunnelResponse => {
			return {
				body: Buffer.from(timeoutHtml).toString('base64'),
				headers: { 'content-type': 'text/html; charset=utf-8' },
				id,
				status: 504,
				statusText: 'Gateway Timeout',
				type: 'response'
			}
		})

		const resBody = response.body ? fromBase64(response.body) : null

		const resHeaders = { ...response.headers }
		delete resHeaders['content-encoding']
		delete resHeaders['transfer-encoding']
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
