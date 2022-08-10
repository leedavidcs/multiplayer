import { WebSocketUtils } from "WebSocketUtils";

export interface WebSocketSessionUser {
	id: string;
}

export interface WebSocketSession {
	user: WebSocketSessionUser | null;
	webSocket: WebSocket;
}

export class WebSocketSessionStorage {
	sessions: WebSocketSession[] = [];

	public register(webSocket: WebSocket, id: string): WebSocketSession {
		const session: WebSocketSession = {
			user: null,
			webSocket
		};

		WebSocketUtils.addOnMessage(webSocket, (data) => {
			
		});

		return session;
	}
}
