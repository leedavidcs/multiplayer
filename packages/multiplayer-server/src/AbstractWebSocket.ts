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

export type AbstractListener<TType extends keyof AbstractEventMap> =
	(event: AbstractEventMap[TType]) => MaybePromise<void>;

export abstract class AbstractWebSocket {
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
		handler: AbstractListener<TType>
	): void;

	public abstract close(
		code?: number | undefined,
		reason?: string | undefined
	): void;

	public abstract send(
		message: string | ArrayBuffer | ArrayBufferView
	): Promise<void>;

	public async handleError(
		error: unknown,
		message?: string
	): Promise<void> {
		if (error instanceof Error) {
			await this.sendMessage({
				type: "$ERROR",
				data: {
					message: message ?? error.message,
					stack: error.stack ?? null
				}
			});

			return;
		}

		await this.sendMessage({
			type: "$ERROR",
			data: {
				message: "Unexpected error",
				stack: null
			}
		});
	}

	public async sendMessage<
		TMessage extends EventMessage<string, any> = EventMessage<string, any>
	>(data: TMessage): Promise<void> {
		await Promise.resolve(this.send(JSON.stringify(data)));
	}
}
