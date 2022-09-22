import { AbstractWebSocket } from "./AbstractWebSocket";

export type InferWebSocketType<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any>>
> = TPlatform extends Maybe<AbstractMultiplayerPlatform<infer IWebSocket>>
	? IWebSocket
	: never;

export type InferPlatformAsync<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any, any>>
> = TPlatform extends AbstractMultiplayerPlatform<any, true>
	? true
	: false;

export abstract class AbstractMultiplayerPlatform<TWebSocket = any, TAsync extends boolean = any> {
	public abstract canAsync: boolean;

	public abstract convertWebSocket(webSocket: TWebSocket): AbstractWebSocket<TAsync>;

	public abstract randomUUID(): string;
}
