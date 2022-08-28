import { EventRecord, Multiplayer, MultiplayerRegisterOptions } from "@package/multiplayer";
import { CloudflareWebSocket } from "./CloudflareWebSocket";

export class CloudflareMultiplayer<
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TInput extends EventRecord<string, any> = {}
> extends Multiplayer<TContext, TOutput, TInput> {
	public register(
		webSocket: WebSocket,
		options?: MultiplayerRegisterOptions<TContext, TOutput>
	) {
		const cloudflareWebSocket = new CloudflareWebSocket(webSocket);

		super._register(cloudflareWebSocket, options);
	}
}
