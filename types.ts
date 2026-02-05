export type Client = { id: string };

/** Server → Client: incoming HTTP request to proxy */
export type TunnelRequest = {
	type: "request";
	id: string;
	method: string;
	pathname: string;
	headers: Record<string, string>;
	body: string; // base64-encoded
};

/** Client → Server: proxied HTTP response */
export type TunnelResponse = {
	type: "response";
	id: string;
	status: number;
	statusText: string;
	headers: Record<string, string>;
	body: string; // base64-encoded
};

/** Server → Client: initial connection info */
export type TunnelInit = {
	type: "init";
	url: string;
};

export type ServerMessage = TunnelRequest;
export type ClientMessage = TunnelResponse;
