import {
	AbstractEventMap,
	AbstractListener,
	AbstractWebSocket
} from "@package/multiplayer-server";

export interface CloudflareWebSocketEventMap {
	close: CloseEvent;
	message: MessageEvent;
	open: Event;
	error: ErrorEvent;
}

export class CloudflareWebSocket extends AbstractWebSocket {
	public webSocket: WebSocket;

	constructor(webSocket: WebSocket) {
		super();

		this.webSocket = webSocket;
	}

	public accept(): void {
		this.webSocket.accept();
	}

	public addEventListener<TType extends keyof AbstractEventMap>(
		type: TType,
		handler: AbstractListener<TType>
	) {
		this.webSocket.addEventListener(type, handler as any);
	}

	public close(code?: number | undefined, reason?: string | undefined): void {
		this.webSocket.close(code, reason);
	}

	public async send(message: string | ArrayBuffer | ArrayBufferView): Promise<void> {
		await Promise.resolve(this.webSocket.send(message));
	}
}
