import {
	AbstractCloseEvent,
	AbstractErrorEvent,
	AbstractEventMap,
	AbstractListener,
	AbstractMessageEvent,
	AbstractWebSocket
} from "@package/multiplayer-server";
import WebSocket from "ws";

export interface NodeWebSocketEventMap {
	close: AbstractCloseEvent;
	message: AbstractMessageEvent;
	open: AbstractEventMap;
	error: AbstractErrorEvent;
}

export class NodeWebSocket extends AbstractWebSocket {
	public webSocket: WebSocket;

	constructor(webSocket: WebSocket) {
		super();

		this.webSocket = webSocket;
	}

	public accept(): void {
		return;
	}

	public addEventListener<TType extends keyof AbstractEventMap>(
		type: TType,
		handler: AbstractListener<TType>
	): void {
		switch (type) {
			case "close":
				this.webSocket.on("close", (code, reason) => {
					(handler as AbstractListener<"close">)({
						code,
						reason: reason.toString("utf-8")
					});
				});

				return;
			case "error":
				this.webSocket.on("error", (error) => {
					(handler as AbstractListener<"error">)({
						error,
						message: error.message
					});
				});

				return;
			case "message":
				this.webSocket.on("message", (data) => {
					(handler as AbstractListener<"message">)({ data });
				});

				return;
			case "open":
				this.webSocket.on("open", () => {
					(handler as AbstractListener<"open">)({});
				});

				return;
			default:
		}
	}

	public close(code?: number | undefined, reason?: string | undefined): void {
		this.webSocket.close(code, reason);
	}

	public async send(message: string | ArrayBuffer | ArrayBufferView): Promise<void> {
		return await new Promise<void>((resolve, reject) => {
			this.webSocket.send(message, (error) => {
				error ? reject(error) : resolve();
			});
		});
	}
}
