import { EventMessage } from "./types";

export type AbstractEvent = Record<string, never>;
export type AbstractCloseEvent = AbstractEvent & {
	readonly code: number;
	readonly reason: string;
};
export type AbstractMessageEvent<T = any> = AbstractEvent & {
	readonly data: T;
};
export type AbstractErrorEvent = AbstractEvent & {
	error: unknown;
	message: string;
};
export interface AbstractEventMap {
	close: AbstractCloseEvent;
	message: AbstractMessageEvent;
	open: AbstractEvent;
	error: AbstractErrorEvent;
}

export type EventType = keyof AbstractEventMap;

export type AbstractListener<TType extends keyof AbstractEventMap> =
	(event: AbstractEventMap[TType]) => MaybePromise<void>;

export abstract class AbstractWebSocket {
	public abstract accept(): void;

	public abstract addEventListener<TType extends EventType>(
		type: TType,
		handler: AbstractListener<TType>
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
