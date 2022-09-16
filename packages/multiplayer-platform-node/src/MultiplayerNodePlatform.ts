import { AbstractMultiplayerPlatform, AbstractWebSocket } from "@package/multiplayer-server";
import crypto from "crypto";
import WebSocket from "ws";
import { NodeWebSocket } from "./NodeWebSocket";

export class MultiplayerNodePlatform extends AbstractMultiplayerPlatform<WebSocket> {
	public convertWebSocket(webSocket: WebSocket): NodeWebSocket {
		return new NodeWebSocket(webSocket);
	}

	public randomUUID(): string {
		return crypto.randomUUID();
	}
}
