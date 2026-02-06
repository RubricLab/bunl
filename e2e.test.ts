import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import type { Subprocess } from 'bun'

const SERVER_PORT = 9100
const DEMO_PORT = 9101
const SUBDOMAIN = 'e2e'

function tunnelFetch(path: string, init?: RequestInit): Promise<Response> {
	const headers = new Headers(init?.headers as HeadersInit)
	headers.set('host', `${SUBDOMAIN}.localhost:${SERVER_PORT}`)
	return fetch(`http://localhost:${SERVER_PORT}${path}`, {
		...init,
		headers
	})
}

let serverProc: Subprocess
let demoProc: Subprocess
let clientProc: Subprocess

async function waitFor(url: string, timeoutMs = 10_000): Promise<void> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			await fetch(url)
			return
		} catch {
			await Bun.sleep(200)
		}
	}
	throw new Error(`Timed out waiting for ${url}`)
}

async function waitForTunnel(timeoutMs = 15_000): Promise<void> {
	const start = Date.now()
	while (Date.now() - start < timeoutMs) {
		try {
			const res = await tunnelFetch('/')
			if (res.status !== 404) return
		} catch {
			/* not ready */
		}
		await Bun.sleep(300)
	}
	throw new Error('Timed out waiting for tunnel to be ready')
}

beforeAll(async () => {
	serverProc = Bun.spawn(['bun', 'run', 'server.ts'], {
		cwd: import.meta.dir,
		env: {
			...process.env,
			DOMAIN: `localhost:${SERVER_PORT}`,
			PORT: String(SERVER_PORT),
			SCHEME: 'http'
		},
		stderr: 'pipe',
		stdout: 'pipe'
	})

	demoProc = Bun.spawn(['bun', 'run', 'demo.tsx'], {
		cwd: import.meta.dir,
		env: { ...process.env, DEMO_PORT: String(DEMO_PORT) },
		stderr: 'pipe',
		stdout: 'pipe'
	})

	await Promise.all([
		waitFor(`http://localhost:${SERVER_PORT}/?new`),
		waitFor(`http://localhost:${DEMO_PORT}/api/health`)
	])

	clientProc = Bun.spawn(
		[
			'bun',
			'run',
			'client.ts',
			'-p',
			String(DEMO_PORT),
			'-d',
			`localhost:${SERVER_PORT}`,
			'-s',
			SUBDOMAIN
		],
		{
			cwd: import.meta.dir,
			env: process.env,
			stderr: 'pipe',
			stdout: 'pipe'
		}
	)

	await waitForTunnel()
})

afterAll(() => {
	clientProc?.kill()
	demoProc?.kill()
	serverProc?.kill()
})

describe('e2e tunnel', () => {
	test('serves HTML through tunnel', async () => {
		const res = await tunnelFetch('/')
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toContain('text/html')
		const body = await res.text()
		expect(body).toContain('<h1>bunl</h1>')
	})

	test('serves CSS through tunnel', async () => {
		const res = await tunnelFetch('/style.css')
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toContain('text/css')
		const body = await res.text()
		expect(body).toContain('font-family')
	})

	test('serves PNG image (binary) through tunnel', async () => {
		const res = await tunnelFetch('/image.png')
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('image/png')
		const buf = await res.arrayBuffer()
		const bytes = new Uint8Array(buf)
		expect(bytes[0]).toBe(0x89)
		expect(bytes[1]).toBe(0x50)
		expect(bytes[2]).toBe(0x4e)
		expect(bytes[3]).toBe(0x47)
	})

	test('serves binary font through tunnel', async () => {
		const res = await tunnelFetch('/font.woff2')
		expect(res.status).toBe(200)
		expect(res.headers.get('content-type')).toBe('font/woff2')
		const buf = await res.arrayBuffer()
		const bytes = new Uint8Array(buf)
		expect(bytes.length).toBe(256)
		expect(bytes[0]).toBe(0)
		expect(bytes[127]).toBe(127)
		expect(bytes[255]).toBe(255)
	})

	test('serves JSON API through tunnel', async () => {
		const res = await tunnelFetch('/api/health')
		expect(res.status).toBe(200)
		const json = await res.json()
		expect(json.status).toBe('ok')
		expect(typeof json.timestamp).toBe('number')
	})

	test('handles POST with body through tunnel', async () => {
		const payload = JSON.stringify({ hello: 'world' })
		const res = await tunnelFetch('/echo', {
			body: payload,
			headers: { 'content-type': 'application/json' },
			method: 'POST'
		})
		expect(res.status).toBe(200)
		const body = await res.text()
		expect(body).toBe(payload)
	})

	test("concurrent requests don't collide", async () => {
		const paths = ['/', '/style.css', '/image.png', '/api/health', '/font.woff2']
		const results = await Promise.all(paths.map(p => tunnelFetch(p).then(r => r.status)))
		expect(results).toEqual([200, 200, 200, 200, 200])
	})

	test('returns 404 for unknown subdomain', async () => {
		const res = await fetch(`http://localhost:${SERVER_PORT}/`, {
			headers: { host: `nonexistent.localhost:${SERVER_PORT}` }
		})
		expect(res.status).toBe(404)
		const body = await res.text()
		expect(body).toContain('Not Found')
	})

	test('returns landing page for root domain', async () => {
		const res = await fetch(`http://localhost:${SERVER_PORT}/`, {
			headers: { host: `localhost:${SERVER_PORT}` }
		})
		expect(res.status).toBe(200)
		const body = await res.text()
		expect(body).toContain('bunl')
		expect(body).toContain('Expose localhost to the world')
	})
})
