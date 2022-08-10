export interface WebSocketMessageEventData {
	type: string;
	data: Record<string, Json>;
}

export type WebSocketMessageHandler = (
	data: WebSocketMessageEventData,
	message: MessageEvent
) => void;

export class WebSocketUtils {
	public static addOnMessage(
		webSocket: WebSocket,
		handler: WebSocketMessageHandler
	): () => void {
		const onMessage = (message: MessageEvent) => {
			const data = WebSocketUtils.parseMessage(message);

			if (!data) {
				WebSocketUtils.sendMessage(webSocket, {
					type: "Error",
					data: { message: "Invalid message" }
				});

				return;
			}

			handler(data, message);
		};

		webSocket.addEventListener("message", onMessage);

		return () => {
			webSocket.removeEventListener("message", onMessage);
		};
	}

	public static makeWebSocketPair(): [client: WebSocket, server: WebSocket] {
		const { 0: client, 1: server } = new WebSocketPair();

		return [client, server];
	}

	private static sendMessage<T extends WebSocketMessageEventData>(
		webSocket: WebSocket,
		data: T
	): void {
		webSocket.send(JSON.stringify(data));
	}

	private static isEventData(value: any): value is WebSocketMessageEventData {
		if (typeof value !== "object") return false;

		return typeof value.type === "string";
	}

	private static parseMessage<T extends WebSocketMessageEventData>(
		message: MessageEvent
	): T | null {
		/**
		 * !HACK
		 * @description We'll only handle stringified JSONs for now
		 * @author David Lee
		 * @date August 9, 2022
		 */
		if (typeof message.data !== "string") return null;

		try {
			const data = JSON.parse(message.data) as T;

			return this.isEventData(data) ? data : null;
		} catch {
			return null;
		}
	}
}
