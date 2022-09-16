import { AbstractWebSocket } from "./AbstractWebSocket";

export type InferWebSocketType<TPlatform extends Maybe<AbstractMultiplayerPlatform<any>>> =
	TPlatform extends Maybe<AbstractMultiplayerPlatform<infer IWebSocket>>
		? IWebSocket
		: never;

export abstract class AbstractMultiplayerPlatform<TWebSocket = any> {
	public abstract convertWebSocket(webSocket: TWebSocket): AbstractWebSocket;

	public abstract randomUUID(): string;
}
