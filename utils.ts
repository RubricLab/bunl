const adjectives = [
	'agile',
	'bold',
	'calm',
	'deft',
	'easy',
	'fair',
	'glad',
	'hale',
	'idle',
	'just',
	'keen',
	'lush',
	'mild',
	'neat',
	'open',
	'pale',
	'rare',
	'safe',
	'tall',
	'vast',
	'warm',
	'zany',
	'able',
	'blue',
	'cool',
	'dark',
	'even',
	'fast',
	'good',
	'high',
	'kind',
	'lean',
	'long',
	'next',
	'pink',
	'real',
	'slim',
	'true',
	'wide',
	'zero'
]

const nouns = [
	'ant',
	'bee',
	'cat',
	'dog',
	'elk',
	'fox',
	'gnu',
	'hen',
	'ibis',
	'jay',
	'koi',
	'lynx',
	'moth',
	'newt',
	'owl',
	'puma',
	'quail',
	'ram',
	'seal',
	'toad',
	'urchin',
	'vole',
	'wolf',
	'yak',
	'ape',
	'bass',
	'crow',
	'dove',
	'eel',
	'frog',
	'goat',
	'hawk',
	'ibex',
	'lark',
	'mole',
	'oryx',
	'pike',
	'rook',
	'swan',
	'wren'
]

function pick<T>(arr: T[]): T {
	const index = Math.floor(Math.random() * arr.length)
	if (!arr[index]) {
		throw new Error('Array is empty')
	}
	return arr[index]
}

export function uid(): string {
	return `${pick(adjectives)}-${pick(adjectives)}-${pick(nouns)}`
}

export function openBrowser(url: string): void {
	const cmds: Record<string, string[]> = {
		darwin: ['open', url],
		win32: ['cmd', '/c', 'start', url]
	}
	const args = cmds[process.platform] ?? ['xdg-open', url]
	Bun.spawn(args, { stdio: ['ignore', 'ignore', 'ignore'] })
}

export function toBase64(buf: ArrayBuffer): string {
	return Buffer.from(buf).toString('base64')
}

export function fromBase64(str: string): Uint8Array<ArrayBuffer> {
	const buf = Buffer.from(str, 'base64')
	return new Uint8Array(buf.buffer as ArrayBuffer, buf.byteOffset, buf.byteLength)
}

export function page(title: string, body: string): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} — bunl</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
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
main { max-width: 480px; width: 100%; }
h1 { font-size: 1.5rem; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 1rem; }
p { color: #666; line-height: 1.6; margin-bottom: 0.75rem; }
code { background: #f5f5f5; padding: 0.15em 0.4em; border-radius: 3px; font-size: 0.9em; }
a { color: #000; }
</style>
</head>
<body>
<main>
${body}
</main>
</body>
</html>`
}
