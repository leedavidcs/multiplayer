import { AbstractEventMap, AbstractWebSocket } from "@package/multiplayer";

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
		handler: (event: AbstractEventMap[TType]) => MaybePromise<void>
	) {
		this.webSocket.addEventListener(type, handler as any);
	}

	public close(code?: number | undefined, reason?: string | undefined): void {
		this.webSocket.close(code, reason);
	}

	public send(message: string | ArrayBuffer | ArrayBufferView): void {
		this.webSocket.send(message);
	}
}
