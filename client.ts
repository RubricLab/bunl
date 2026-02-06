import { parseArgs } from 'node:util'
import type { TunnelInit, TunnelRequest, TunnelResponse } from './types'
import { fromBase64, openBrowser, page, toBase64 } from './utils'

function badGatewayHtml(port: string) {
	return page(
		'Bad Gateway',
		`<h1>Bad Gateway</h1>
<p>Could not reach <code>localhost:${port}</code>.</p>
<p>Make sure your local server is running.</p>`
	)
}

async function main({
	port,
	domain,
	subdomain,
	open
}: {
	port?: string
	domain?: string
	subdomain?: string
	open?: boolean
}) {
	const params = new URLSearchParams({
		new: '',
		...(subdomain ? { subdomain } : {})
	}).toString()

	const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(domain || '')
	const wsScheme = isLocal ? 'ws' : 'wss'
	const serverUrl = `${wsScheme}://${domain}?${params}`
	const socket = new WebSocket(serverUrl)
	const localHost = Bun.env.HOST || 'localhost'
	const localOrigin = `http://${localHost}:${port}`

	socket.addEventListener('message', async event => {
		const data = JSON.parse(event.data as string)

		if (data.type === 'init') {
			const init = data as TunnelInit
			console.log(`\n↪ Your URL: \x1b[32m${init.url}\x1b[0m\n`)
			if (open) openBrowser(init.url)
			return
		}

		if (data.type === 'request') {
			const req = data as TunnelRequest
			const now = performance.now()

			try {
				const reqBody =
					req.body && req.method !== 'GET' && req.method !== 'HEAD' ? fromBase64(req.body) : null

				const fwdHeaders = { ...req.headers }
				delete fwdHeaders.host
				delete fwdHeaders.connection
				delete fwdHeaders['transfer-encoding']

				const res = await fetch(`${localOrigin}${req.pathname}`, {
					body: reqBody,
					headers: fwdHeaders,
					method: req.method
				})

				const elapsed = (performance.now() - now).toFixed(1)
				console.log(`\x1b[32m${req.method}\x1b[0m ${req.pathname} → ${res.status} (${elapsed}ms)`)

				const resBody = await res.arrayBuffer()
				const headers: Record<string, string> = {}
				res.headers.forEach((v, k) => {
					headers[k] = v
				})

				const response: TunnelResponse = {
					body: toBase64(resBody),
					headers,
					id: req.id,
					status: res.status,
					statusText: res.statusText,
					type: 'response'
				}

				socket.send(JSON.stringify(response))
			} catch (err) {
				console.error(`\x1b[31mERR\x1b[0m ${req.method} ${req.pathname}: ${err}`)

				const html = badGatewayHtml(port || '3000')
				const response: TunnelResponse = {
					body: toBase64(new TextEncoder().encode(html).buffer),
					headers: { 'content-type': 'text/html; charset=utf-8' },
					id: req.id,
					status: 502,
					statusText: 'Bad Gateway',
					type: 'response'
				}
				socket.send(JSON.stringify(response))
			}
		}
	})

	socket.addEventListener('open', () => {
		console.log(`Connected to ${serverUrl}`)
	})

	socket.addEventListener('close', () => {
		console.warn('Server closed connection')
		process.exit(1)
	})

	socket.addEventListener('error', err => {
		console.error('WebSocket error:', err)
		process.exit(1)
	})
}

const { values } = parseArgs({
	allowPositionals: true,
	args: process.argv,
	options: {
		domain: { default: 'bunl.sh', short: 'd', type: 'string' },
		open: { short: 'o', type: 'boolean' },
		port: { default: '3000', short: 'p', type: 'string' },
		subdomain: { short: 's', type: 'string' },
		version: { short: 'v', type: 'boolean' }
	}
})

if (values.version) {
	const pkg = await Bun.file(new URL('./package.json', import.meta.url)).json()
	console.log(pkg.version)
	process.exit()
}

main({
	domain: values.domain || 'bunl.sh',
	open: values.open || false,
	port: values.port || '3000',
	subdomain: values.subdomain || ''
}).catch(err => {
	console.error(err)
	process.exit(1)
})
