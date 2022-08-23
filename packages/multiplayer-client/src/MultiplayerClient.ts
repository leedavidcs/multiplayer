import { ObjectUtils, TypedEvent } from "@package/common-utils";
import {
	EventData,
	EventRecord,
	InferEventMessage,
	InputZodLike,
	MultiplayerInternal,
	MultiplayerLike
} from "@package/multiplayer-internal";
import { MultiplayerEventTarget } from "./MultiplayerEventTarget";
import { WebSocketManager } from "./WebSocketManager";

export interface EventConfig<TData extends EventData = {}> {
	input?: InputZodLike<TData>;
}

export type InferEventConfig<
	TEvents extends EventRecord<string, any> = {}
> = {
	[P in keyof TEvents]: P extends string
		? Id<EventConfig<TEvents[P]>>
		: never;
};

export interface MultiplayerClientOptions<
	TEvents extends EventRecord<string, any> = {}
> {
	apiEndpoint: string;
	debug?: boolean;
	events?: InferEventConfig<TEvents>;
}

export class MultiplayerClient<
	TOutput extends EventRecord<string, any> = {},
	TInput extends EventRecord<string, any> = {}
> extends MultiplayerEventTarget<TInput> implements MultiplayerLike<TInput> {
	/**
	 * !HACK
	 * @description This is only used for type inferences in a generic way
	 * @author David Lee
	 * @date August 13, 2022
	 */
	readonly _def: {
		input: TInput;
	} = {} as any;

	public apiEndpoint: string;
	public events: InferEventConfig<TInput>;

	private _webSocket: WebSocketManager<TOutput>;

	constructor(options: MultiplayerClientOptions<TInput>) {
		super();

		this.apiEndpoint = options.apiEndpoint;
		this.events = options.events ?? {} as InferEventConfig<TInput>;

		this._webSocket = new WebSocketManager<TOutput>({
			apiEndpoint: this.apiEndpoint,
			debug: options.debug,
			onMessage: (message) => {
				const rawMessage = this._parseMessage(message);

				if (!rawMessage) return;

				this.dispatchEvent(new TypedEvent(rawMessage.type, rawMessage));
			}
		});
	}

	public broadcast(message: InferEventMessage<TOutput>): void {
		return this._webSocket.broadcast(message);
	}

	public connect(): Promise<void> {
		return this._webSocket.connect();
	}

	public disconnect(): void {
		return this._webSocket.disconnect();
	}

	public event<
		TEvent extends string,
		TData extends EventData = {}
	>(
		event: TEvent,
		config: EventConfig<TData>
	): MultiplayerClient<
		TOutput,
		Spread<[
			TInput,
			EventRecord<TEvent, TData>
		]>
	> {
		if (event.startsWith("$")) {
			throw new Error("Event name must not start with \"$\".");
		}

		const newEvent = {
			[event]: config
		} as InferEventConfig<EventRecord<TEvent, TData>>;

		return MultiplayerClient.merge(
			this,
			new MultiplayerClient({
				apiEndpoint: this.apiEndpoint,
				events: newEvent
			})
		);
	}

	public static merge<
		TOutputStatic extends EventRecord<string, any>,
		TInputStatic1 extends EventRecord<string, any>,
		TInputStatic2 extends EventRecord<string, any>,
	>(
		multiplayer1: MultiplayerClient<TOutputStatic, TInputStatic1>,
		multiplayer2: MultiplayerClient<TOutputStatic, TInputStatic2>
	): MultiplayerClient<TOutputStatic, Spread<[TInputStatic1, TInputStatic2]>> {
		const events1 = multiplayer1.events;
		const events2 = multiplayer2.events;

		const mergedEvents = ObjectUtils.safeAssign(events1, events2);

		return new MultiplayerClient({
			apiEndpoint: multiplayer1.apiEndpoint,
			events: mergedEvents as any
		});
	}

	public reconnect(): Promise<void> {
		return this._webSocket.reconnect();
	}

	private _parseMessage(
		message: MessageEvent<string>
	): InferEventMessage<TInput> | null {
		const rawMessage = MultiplayerInternal.parseMessage(message);

		if (!rawMessage) return null;

		const eventConfig = this.events[rawMessage.type] ?? null;

		if (!eventConfig) return null;

		const input = eventConfig.input?.parse(rawMessage.data) ??
			/**
			 * !HACK
			 * @description Config doesn't specify validation. Just return {}
			 * instead in the resolver.
			 * @author David Lee
			 * @date August 13, 2022
			 */
			{} as TInput[string];

		return {
			type: rawMessage.type,
			data: input
		} as InferEventMessage<TInput>;
	}
}

export const createClient = (
	options: MultiplayerClientOptions
): MultiplayerClient<{}, {}> => {
	return new MultiplayerClient<{}, {}>(options);
};
