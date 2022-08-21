import { ObjectUtils } from "@package/common-utils";
import {
	DefaultClientEventRecord,
	DefaultServerMessage,
	EventData,
	EventMessage,
	EventRecord,
	InferEventMessage,
	InputZodLike,
	MultiplayerInternal
} from "@package/multiplayer-internal";

interface WebSocketSession {
	id: string;
	quit: boolean;
	webSocket: WebSocket;
}

interface EventResolverHelpers<
	TEnv,
	TOutput extends EventRecord<string, any> = {}
> {
	broadcast: (message: InferEventMessage<TOutput> | DefaultServerMessage) => void;
	env: TEnv;
}

export type EventResolver<
	TEnv,
	TOutput extends EventRecord<string, any> = {},
	TData extends EventData = {}
> = (data: TData, helpers: EventResolverHelpers<TEnv, TOutput>) => void;

export interface EventConfig<
	TEnv,
	TOutput extends EventRecord<string, any> = {},
	TData extends EventData = {}
> {
	input?: InputZodLike<TData>;
	resolver: EventResolver<TEnv, TOutput, TData>;
}

type InferEventConfig<
	TEnv,
	TOutput extends EventRecord<string, any> = {},
	TEvents extends EventRecord<string, any> = {}
> = {
	[P in keyof TEvents]: P extends string
		? Id<EventConfig<TEnv, TOutput, TEvents[P]>>
		: never;
};

export interface MultiplayerConfigOptions<TEnv> {
	env: TEnv;
	storage: DurableObjectStorage;
};

export interface MultiplayerOptions<
	TEnv,
	TOutput extends EventRecord<string, any>,
	TInput extends EventRecord<string, any>
> {
	events?: InferEventConfig<TEnv, TOutput, TInput>;
}

export class Multiplayer<
	TEnv,
	TOutput extends EventRecord<string, any> = {},
	TInput extends EventRecord<string, any> = {}
> {
	/**
	 * !HACK
	 * @description This is only used for type inferences in a generic way
	 * @author David Lee
	 * @date August 13, 2022
	 */
	readonly _def: {
		input: TInput;
	} = {} as any;

	private _config: MultiplayerConfigOptions<TEnv> | null = null;
	private _internalEvents: InferEventConfig<TEnv, TOutput, DefaultClientEventRecord> = {
		$PING: {
			resolver: (data, { broadcast }) => {
				broadcast({ type: "$PONG", data: {} });
			}
		}
	};
	private _sessions = new Map<string, WebSocketSession>();

	public events: InferEventConfig<TEnv, TOutput, TInput>;

	constructor(options: MultiplayerOptions<TEnv, TOutput, TInput> = {}) {
		this.events = options.events
			?? {} as InferEventConfig<TEnv, TOutput, TInput>;
	}

	public broadcast(
		message: InferEventMessage<TOutput> | DefaultServerMessage
	): void {
		const quitters: WebSocketSession[] = [];

		this._sessions.forEach((session) => {
			quitters.push(session);
		});

		quitters.forEach((session) => {
			this._sessions.delete(session.id);
		});

		this._sessions.forEach((session) => {
			Multiplayer._sendMessage(session.webSocket, message);
		});

		quitters.forEach((quitter) => {
			this.broadcast({
				type: "$EXIT",
				data: {
					sessionId: quitter.id,
				}
			});
		});
	}

	public config(
		options: MultiplayerConfigOptions<TEnv>
	): Multiplayer<TEnv, TOutput, TInput> {
		if (this._config) {
			throw new Error("Multiplayer has already been configured.");
		}

		this._config = options;

		return this;
	}

	public event<
		TEvent extends string,
		TData extends EventData = {}
	>(
		event: TEvent,
		config: EventConfig<TEnv, TOutput, TData>
	): Multiplayer<
		TEnv,
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
		} as InferEventConfig<TEnv, TOutput, EventRecord<TEvent, TData>>;

		return Multiplayer.merge(this, new Multiplayer({ events: newEvent }));
	}

	public static merge<
		TEnvStatic,
		TOutputStatic extends EventRecord<string, any>,
		TInputStatic1 extends EventRecord<string, any>,
		TInputStatic2 extends EventRecord<string, any>
	>(
		multiplayer1: Multiplayer<TEnvStatic, TOutputStatic, TInputStatic1>,
		multiplayer2: Multiplayer<TEnvStatic, TOutputStatic, TInputStatic2>
	): Multiplayer<TEnvStatic, TOutputStatic, Spread<[TInputStatic1, TInputStatic2]>> {
		const events1 = multiplayer1.events;
		const events2 = multiplayer2.events;

		const mergedEvents = ObjectUtils.safeAssign(events1, events2);

		return new Multiplayer({ events: mergedEvents as any });
	}

	public register(webSocket: WebSocket): void {
		if (!this._config) {
			throw new Error(
				"Must call \"config\" before registering a new WebSocket."
			);
		}

		webSocket.accept();

		const session: WebSocketSession = {
			id: crypto.randomUUID(),
			quit: false,
			webSocket
		};

		this._sessions.set(session.id, session)

		webSocket.addEventListener("message", async (message) => {
			// Should not reach here. But handling it just in-case.
			if (session.quit) {
				webSocket.close(1011, "WebSocket broken");

				return;
			}

			const rawMessage = MultiplayerInternal.parseMessage(message);

			/**
			 * !HACK
			 * @description We'll ignore any message that doesn't return a Json
			 * for now
			 * @author David Lee
			 * @date August 10, 2022
			 */
			if (!rawMessage) return;

			await this._handleEventMessage(webSocket, rawMessage, this._internalEvents);
			await this._handleEventMessage(webSocket, rawMessage, this.events);
		});

		const closeHandler = () => {
			session.quit = true;

			this._sessions.delete(session.id);

			this.broadcast({
				type: "$EXIT",
				data: {
					sessionId: session.id,
				}
			});
		};

		webSocket.addEventListener("close", closeHandler);
		webSocket.addEventListener("error", closeHandler);
	}

	private async _handleEventMessage(
		webSocket: WebSocket,
		message: EventMessage<string, any>,
		events: InferEventConfig<TEnv, TOutput, EventRecord<string, any>>
	): Promise<void> {
		const eventConfig = events[message.type] ?? null;

		if (!eventConfig) return;

		let input: TInput[string]

		try {
			input = eventConfig.input?.parse(message.data) ??
				/**
				 * !HACK
				 * @description Config doesn't specify validation. Just return {}
				 * instead in the resolver.
				 * @author David Lee
				 * @date August 13, 2022
				 */
				{} as TInput[string];
		} catch(error) {
			this._handleWsError(webSocket, error, "Invalid input");

			return;
		}

		try {
			await Promise.resolve(
				eventConfig.resolver(input, {
					broadcast: this.broadcast,
					/* eslint-disable-next-line */
					env: this._config!.env
				})
			);
		} catch (error) {
			this._handleWsError(webSocket, error);
		}
	}

	private _handleWsError(
		webSocket: WebSocket,
		error: unknown,
		message?: string
	): void {
		if (!(error instanceof Error)) {
			Multiplayer._sendMessage(webSocket, {
				type: "$ERROR",
				data: {
					message: "Unexpected error",
					stack: null
				}
			});

			return;
		}

		Multiplayer._sendMessage(webSocket, {
			type: "$ERROR",
			data: {
				message: message ?? error.message,
				stack: error.stack ?? null
			}
		});
	}

	private static _sendMessage<
		TMessage extends EventMessage<string, any> = EventMessage<string, any>
	>(webSocket: WebSocket, data: TMessage): void {
		webSocket.send(JSON.stringify(data));
	}
}

export const createMultiplayer = <
	TEnv = {},
	TOutput extends EventRecord<string, any> = {}
>(): Multiplayer<TEnv, TOutput, DefaultClientEventRecord> => {
	return new Multiplayer<TEnv, TOutput, DefaultClientEventRecord>();
};
