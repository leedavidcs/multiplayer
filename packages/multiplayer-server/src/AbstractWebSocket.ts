import type { EventMessage } from "@package/multiplayer-internal";

export type AbstractEvent = {};
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

export type AbstractListener<TType extends keyof AbstractEventMap, TAsync extends boolean> =
	(event: AbstractEventMap[TType]) => TAsync extends true ? MaybePromise<void> : void;

export abstract class AbstractWebSocket<TAsync extends boolean> {
	public abstract canAsync: TAsync;

	public abstract accept(): void;

	/**
	 * TODO
	 * @description Return an unsubscribe method to remove the event-listener.
	 * This is preferred over adding an explicit abstract removeEventListener
	 * method, because the implementing class might have to transform the
	 * listener, and removing the same listener might be complicated as a
	 * result.
	 * @author David Lee
	 * @date August 28, 2022
	 */
	public abstract addEventListener<TType extends EventType>(
		type: TType,
		handler: AbstractListener<TType, TAsync>
	): void;

	public abstract close(
		code?: number | undefined,
		reason?: string | undefined
	): void;

	public abstract send(
		message: string | ArrayBuffer | ArrayBufferView
	): TAsync extends true ? MaybePromise<void> : void;

	public handleError(
		error: unknown,
		message?: string
	): TAsync extends true ? Promise<void> : void {
		return error instanceof Error
			? this.sendMessage({
				type: "$ERROR",
				data: {
					message: message ?? error.message,
					stack: error.stack ?? null
				}
			})
			: this.sendMessage({
				type: "$ERROR",
				data: {
					message: "Unexpected error",
					stack: null
				}
			});
	}

	public sendMessage<
		TMessage extends EventMessage<string, any> = EventMessage<string, any>
	>(data: TMessage): TAsync extends true ? Promise<void> : void {
		return this.canAsync
			? Promise.resolve(this.send(JSON.stringify(data)))
			: this.send(JSON.stringify(data)) as any;
	}
}
