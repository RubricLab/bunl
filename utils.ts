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

/** Generate a human-readable unique identifier, e.g. "bold-calm-fox" */
export function uid(): string {
	return `${pick(adjectives)}-${pick(adjectives)}-${pick(nouns)}`
}

/** Open a URL in the default browser using platform-native commands */
export function openBrowser(url: string): void {
	const cmds: Record<string, string[]> = {
		darwin: ['open', url],
		win32: ['cmd', '/c', 'start', url]
	}
	const args = cmds[process.platform] ?? ['xdg-open', url]
	Bun.spawn(args, { stdio: ['ignore', 'ignore', 'ignore'] })
}

/** Encode an ArrayBuffer to base64 */
export function toBase64(buf: ArrayBuffer): string {
	return Buffer.from(buf).toString('base64')
}

/** Decode a base64 string to a Uint8Array */
export function fromBase64(str: string): Uint8Array<ArrayBuffer> {
	const buf = Buffer.from(str, 'base64')
	return new Uint8Array(buf.buffer as ArrayBuffer, buf.byteOffset, buf.byteLength)
}
