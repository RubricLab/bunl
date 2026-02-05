/**
 * Demo webserver that serves multiple content types for testing the tunnel.
 * Exercises: HTML, CSS, JSON API, binary images (PNG), and binary fonts (WOFF2-like).
 */

import { serve } from 'bun'

const port = Number(Bun.env.DEMO_PORT) || 3000

// 1x1 red PNG pixel (67 bytes) — smallest valid PNG
const PNG_1PX = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
	'base64'
)

// Generate a binary blob to simulate a font file
const FAKE_FONT = (() => {
	const buf = Buffer.alloc(256)
	for (let i = 0; i < 256; i++) buf[i] = i
	return buf
})()

const CSS_CONTENT = `body { font-family: sans-serif; background: #111; color: #0f0; padding: 2rem; }
img { border: 2px solid #0f0; margin: 1rem 0; }`

const HTML = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>bunl demo</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body>
  <h1>bunl tunnel works!</h1>
  <p>This page was served through the tunnel.</p>
  <img src="/image.png" alt="test pixel" width="100" height="100">
  <p><a href="/api/health">JSON API</a> · <a href="/font.woff2">Font binary</a></p>
</body>
</html>`

serve({
	fetch(req) {
		const url = new URL(req.url)
		const { pathname } = url

		console.log(`${req.method} ${pathname}`)

		if (pathname === '/style.css') {
			return new Response(CSS_CONTENT, {
				headers: { 'content-type': 'text/css; charset=utf-8' }
			})
		}

		if (pathname === '/image.png') {
			return new Response(new Uint8Array(PNG_1PX), {
				headers: { 'content-type': 'image/png' }
			})
		}

		if (pathname === '/font.woff2') {
			return new Response(new Uint8Array(FAKE_FONT), {
				headers: { 'content-type': 'font/woff2' }
			})
		}

		if (pathname === '/api/health') {
			return Response.json({ status: 'ok', timestamp: Date.now() })
		}

		if (pathname === '/echo' && req.method === 'POST') {
			return new Response(req.body, {
				headers: {
					'content-type': req.headers.get('content-type') || 'application/octet-stream'
				}
			})
		}

		return new Response(HTML, {
			headers: { 'content-type': 'text/html; charset=utf-8' }
		})
	},
	port
})

console.log(`Demo server at http://localhost:${port}`)
