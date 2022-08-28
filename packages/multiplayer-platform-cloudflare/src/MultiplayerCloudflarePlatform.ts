import { AbstractMultiplayerPlatform } from "@package/multiplayer";
import { CloudflareWebSocket } from "./CloudflareWebSocket";

export class MultiplayerCloudflarePlatform extends AbstractMultiplayerPlatform<WebSocket> {
	public convertWebSocket(webSocket: WebSocket): CloudflareWebSocket {
		return new CloudflareWebSocket(webSocket);
	}
}
