type AbstractEvent = Record<string, never>;
type AbstractCloseEvent = AbstractEvent & {
	readonly code: number;
	readonly reason: string;
};
type AbstractMessageEvent<T = any> = AbstractEvent & {
	readonly data: T;
};
type AbstractErrorEvent = AbstractEvent & {
	error: unknown;
	message: string;
};
type AbstractListenerEvent =
	| AbstractCloseEvent
	| AbstractMessageEvent
	| AbstractEvent
	| AbstractErrorEvent;

export abstract class AbstractWebSocket {
	public abstract accept(): void;

	public abstract addEventListener<TType extends string>(
		type: TType,
		handler: AbstractListenerEvent
	): void;

	public abstract close(
		code?: number | undefined,
		reason?: string | undefined
	): void;

	public abstract send(
		message: string | ArrayBuffer | ArrayBufferView
	): void;
}
