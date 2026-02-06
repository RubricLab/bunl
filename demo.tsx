import { serve } from 'bun'
import { renderToStaticMarkup } from 'react-dom/server'

const port = Number(Bun.env.DEMO_PORT) || 3000

const PNG_1PX = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==',
	'base64'
)

const FAKE_FONT = (() => {
	const buf = Buffer.alloc(256)
	for (let i = 0; i < 256; i++) buf[i] = i
	return buf
})()

const css = `* {
	margin: 0;
	padding: 0;
	box-sizing: border-box;
}

body {
	font-family: system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
	background: #fff;
	color: #000;
	min-height: 100vh;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 2rem;
}

main {
	max-width: 480px;
	width: 100%;
}

h1 {
	font-size: 1.5rem;
	font-weight: 600;
	letter-spacing: -0.02em;
	margin-bottom: 1rem;
}

p {
	color: #666;
	margin-bottom: 1.5rem;
	line-height: 1.6;
}

img {
	display: block;
	margin-bottom: 1.5rem;
	border: 1px solid #eee;
}

nav a {
	color: #000;
	text-decoration: none;
	border-bottom: 1px solid #ccc;
}

nav a:hover {
	border-color: #000;
}

nav span {
	color: #ccc;
	margin: 0 0.5rem;
}`

function Page() {
	return (
		<html lang="en">
			<head>
				<meta charSet="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>bunl</title>
				<link rel="stylesheet" href="/style.css" />
			</head>
			<body>
				<main>
					<h1>bunl</h1>
					<p>Served through a tunnel.</p>
					<img src="/image.png" alt="test" width={100} height={100} />
					<nav>
						<a href="/api/health">API</a>
						<span>·</span>
						<a href="/font.woff2">Font</a>
					</nav>
				</main>
			</body>
		</html>
	)
}

const html = `<!DOCTYPE html>${renderToStaticMarkup(<Page />)}`

serve({
	fetch(req) {
		const { pathname } = new URL(req.url)

		if (pathname === '/style.css')
			return new Response(css, { headers: { 'content-type': 'text/css; charset=utf-8' } })

		if (pathname === '/image.png')
			return new Response(new Uint8Array(PNG_1PX), { headers: { 'content-type': 'image/png' } })

		if (pathname === '/font.woff2')
			return new Response(new Uint8Array(FAKE_FONT), { headers: { 'content-type': 'font/woff2' } })

		if (pathname === '/api/health') return Response.json({ status: 'ok', timestamp: Date.now() })

		if (pathname === '/echo' && req.method === 'POST')
			return new Response(req.body, {
				headers: {
					'content-type': req.headers.get('content-type') || 'application/octet-stream'
				}
			})

		return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
	},
	port
})

console.log(`Demo server at http://localhost:${port}`)
