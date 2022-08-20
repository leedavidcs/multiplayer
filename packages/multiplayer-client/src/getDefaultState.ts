export enum ConnectionState {
	Closed = "Closed",
	Connecting = "Connecting",
	Open = "Open"
}

export interface Connection {
	state: ConnectionState;
}

export interface State {
	connection: Connection;
	webSocket: WebSocket | null;
}

export const getDefaultState = (): State => {
	return {
		connection: {
			state: ConnectionState.Closed
		},
		webSocket: null
	};
};
