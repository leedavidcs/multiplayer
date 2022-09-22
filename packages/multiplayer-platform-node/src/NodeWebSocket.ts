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

export class NodeWebSocket extends AbstractWebSocket<true> {
	public canAsync = true as const;
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
		handler: AbstractListener<TType, true>
	): void {
		switch (type) {
			case "close":
				this.webSocket.on("close", async (code, reason) => {
					await Promise.resolve((handler as AbstractListener<"close", true>)({
						code,
						reason: reason.toString("utf-8")
					}));
				});

				return;
			case "error":
				this.webSocket.on("error", async (error) => {
					await Promise.resolve((handler as AbstractListener<"error", true>)({
						error,
						message: error.message
					}));
				});

				return;
			case "message":
				this.webSocket.on("message", async (data) => {
					await Promise.resolve((handler as AbstractListener<"message", true>)({
						data
					}));
				});

				return;
			case "open":
				this.webSocket.on("open", async () => {
					await Promise.resolve((handler as AbstractListener<"open", true>)({}));
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
