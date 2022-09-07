import { ObjectUtils, TypedEvent } from "@package/common-utils";
import {
	DefaultServerEventRecord,
	EventData,
	EventRecord,
	InferEventMessage,
	InputZodLike,
	MultiplayerInternal,
	MultiplayerLike
} from "@package/multiplayer-internal";
import { MultiplayerEventTarget } from "./MultiplayerEventTarget";
import { ConnectionState, WebSocketConnection, WebSocketManager, WebSocketState } from "./WebSocketManager";

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

export interface MultiplayerClientConfigOptions {
	apiEndpoint: string | (() => MaybePromise<string>);
	debug?: boolean;
	onConnectionUpdate?: (state: WebSocketState) => void;
}

interface InternalConfig {
	apiEndpoint?: string | (() => MaybePromise<string>);
	debug?: boolean;
}

export interface MultiplayerClientOptions<
	TEvents extends EventRecord<string, any> = {}
> {
	apiEndpoint?: string | (() => MaybePromise<string>);
	debug?: boolean;
	events?: InferEventConfig<TEvents>;
	onConnectionUpdate?: (state: WebSocketState) => void;
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
		output: TOutput;
	} = {} as any;

	readonly _config: InternalConfig;
	readonly _events: InferEventConfig<TInput>;

	private _webSocket: WebSocketManager<TOutput>;

	constructor(options: MultiplayerClientOptions<TInput>) {
		super();

		this._config = {
			apiEndpoint: options.apiEndpoint,
			debug: options.debug,
		};

		this._events = options.events ?? {} as InferEventConfig<TInput>;

		this._webSocket = new WebSocketManager<TOutput>({
			apiEndpoint: this._config.apiEndpoint,
			debug: this._config.debug,
			onMessage: (message) => {
				const rawMessage = this._parseMessage(message);

				if (!rawMessage) return;

				this._logDebug("WebSocket event received: ", rawMessage.type, rawMessage);

				this.dispatchEvent(new TypedEvent(rawMessage.type, rawMessage));
			},
			onUpdate: (state) => {
				options.onConnectionUpdate?.(state);
			}
		});
	}

	public get connection(): WebSocketConnection {
		return this._webSocket.connection;
	}

	public get webSocket(): WebSocket | null {
		return this._webSocket.webSocket;
	}

	public broadcast(message: InferEventMessage<TOutput>): void {
		return this._webSocket.broadcast(message);
	}

	public connect(): Promise<void> {
		if (!this._config.apiEndpoint) {
			throw new Error("Must provide an apiEndpoint.");
		}

		return this._webSocket.connect();
	}

	public disconnect(): void {
		if (!this._config.apiEndpoint) {
			throw new Error("Must provide an apiEndpoint.");
		}

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
				apiEndpoint: this._config.apiEndpoint,
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
		const events1 = multiplayer1._events;
		const events2 = multiplayer2._events;

		const mergedEvents = ObjectUtils.safeAssign(events1, events2);

		return new MultiplayerClient({
			apiEndpoint: multiplayer1._config.apiEndpoint,
			events: mergedEvents as any
		});
	}

	public reconnect(): Promise<void> {
		if (!this._config.apiEndpoint) {
			throw new Error("Must provide an apiEndpoint.");
		}

		return this._webSocket.reconnect();
	}

	public setConfig(
		options: MultiplayerClientConfigOptions
	): MultiplayerClient<TOutput, TInput> {
		if (this._webSocket.connection.state !== ConnectionState.Closed) {
			throw new Error(
				"Could not setConfig MultiplayerClient. Make sure websocket connections are first closed"
			);
		}

		return new MultiplayerClient<TOutput, TInput>({
			apiEndpoint: options.apiEndpoint,
			debug: options.debug,
			events: this._events,
		});
	}

	public useBroadcastType<
		TNewOutput extends EventRecord<string, any> = {}
	>(): MultiplayerClient<TNewOutput, TInput> {
		return this as any;
	}

	private _logDebug(...data: any[]): void {
		this._config.debug && console.log(data);
	}

	private _parseMessage(
		message: MessageEvent<string>
	): InferEventMessage<TInput> | null {
		const rawMessage = MultiplayerInternal.parseMessage(message);

		if (!rawMessage) return null;

		const eventConfig = this._events[rawMessage.type] ?? null;

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

export interface CreateMultiplayerClientOptions {
	apiEndpoint?: string | (() => MaybePromise<string>);
	debug?: boolean;
}

export const createClient = (
	options: CreateMultiplayerClientOptions = {}
): MultiplayerClient<{}, DefaultServerEventRecord> => {
	return new MultiplayerClient<{}, DefaultServerEventRecord>(options);
};
