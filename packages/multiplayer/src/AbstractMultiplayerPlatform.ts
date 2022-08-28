import { AbstractWebSocket } from "./AbstractWebSocket";

export type InferWebSocketType<TPlatform extends AbstractMultiplayerPlatform<any>> =
	TPlatform extends AbstractMultiplayerPlatform<infer IWebSocket> ? IWebSocket : never;

export abstract class AbstractMultiplayerPlatform<TWebSocket = any> {
	public abstract convertWebSocket(webSocket: TWebSocket): AbstractWebSocket;
}
