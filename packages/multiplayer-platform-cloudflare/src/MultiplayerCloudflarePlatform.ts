import { AbstractMultiplayerPlatform } from "@package/multiplayer-server";
import { CloudflareWebSocket } from "./CloudflareWebSocket";

export class MultiplayerCloudflarePlatform extends AbstractMultiplayerPlatform<WebSocket> {
	public canAsync = false as const;

	public convertWebSocket(webSocket: WebSocket): CloudflareWebSocket {
		return new CloudflareWebSocket(webSocket);
	}

	public randomUUID(): string {
		return crypto.randomUUID();
	}
}
