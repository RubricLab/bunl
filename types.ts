export type Client = { id: string }

export type TunnelRequest = {
	type: 'request'
	id: string
	method: string
	pathname: string
	headers: Record<string, string>
	body: string
}

export type TunnelResponse = {
	type: 'response'
	id: string
	status: number
	statusText: string
	headers: Record<string, string>
	body: string
}

export type TunnelInit = {
	type: 'init'
	url: string
}
