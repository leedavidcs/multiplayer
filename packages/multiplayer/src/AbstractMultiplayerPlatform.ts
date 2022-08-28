import { AbstractWebSocket } from "./AbstractWebSocket";

export abstract class AbstractMultiplayerPlatform<TWebSocket = any> {
	public abstract convertWebSocket(webSocket: TWebSocket): AbstractWebSocket;
}
