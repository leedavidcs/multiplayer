import { EventMessage } from "./types";

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

	public handleError(
		error: unknown,
		message?: string
	): void {
		if (error instanceof Error) {
			this.sendMessage({
				type: "$ERROR",
				data: {
					message: message ?? error.message,
					stack: error.stack ?? null
				}
			});

			return;
		}

		this.sendMessage({
			type: "$ERROR",
			data: {
				message: "Unexpected error",
				stack: null
			}
		});
	}

	public sendMessage<
		TMessage extends EventMessage<string, any> = EventMessage<string, any>
	>(data: TMessage): void {
		this.send(JSON.stringify(data));
	}
}
