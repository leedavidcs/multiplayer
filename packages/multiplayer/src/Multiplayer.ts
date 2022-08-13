import {
	DefaultOutputMessage,
	EventData,
	EventMessage,
	EventRecord,
	InferEventMessage,
	InputZodLike
} from "@package/multiplayer-internal";

interface WebSocketSession {
	id: string;
	quit: boolean;
	webSocket: WebSocket;
}

export interface EventResolverHelpers<
	TEnv,
	TOutput extends EventRecord<string, any> = {}
> {
	broadcast: (message: InferEventMessage<TOutput>) => void;
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
	input: InputZodLike<TData>;
	resolver: EventResolver<TEnv, TOutput, TData>;
}

export type InputEventRecord<
	TEnv,
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: EventConfig<TEnv, TData> };

export interface MultiplayerOptions<
	TEnv,
	TOutput extends EventRecord<string, any>,
	TInput extends EventRecord<string, any>
> {
	events?: InferEventConfig<TEnv, TOutput, TInput>;
}

export interface MultiplayerConfigOptions<TEnv> {
	env: TEnv;
};

export type InferEventConfig<
	TEnv,
	TOutput extends EventRecord<string, any> = {},
	TEvents extends EventRecord<string, any> = {}
> = {
	[P in keyof TEvents]: P extends string
		? Id<EventConfig<TEnv, TOutput, TEvents[P]>>
		: never;
};

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
	private _sessions: WebSocketSession[] = [];

	public events: InferEventConfig<TEnv, TOutput, TInput>;

	constructor(options: MultiplayerOptions<TEnv, TOutput, TInput> = {}) {
		this.events = options.events ?? {} as TInput;
	}

	public broadcast(
		message: InferEventMessage<TOutput> | DefaultOutputMessage
	): void {
		const { stayers, quitters } = this._sessions.reduce(
			(state, session) => {
				return session.quit
					? {
						stayers: state.stayers,
						quitters: [...state.quitters, session]
					}
					: {
						stayers: [...state.stayers, session],
						quitters: state.quitters
					};
			},
			{
				stayers: [] as WebSocketSession[],
				quitters: [] as WebSocketSession[]
			}
		);

		this._sessions = stayers;

		stayers.forEach((stayer) => {
			Multiplayer.sendMessage(stayer.webSocket, message);
		});

		quitters.forEach((quitter) => {
			this.broadcast({
				type: "$INTERNAL_QUIT",
				data: { id: quitter.id }
			});
		});
	}

	public config(options: MultiplayerConfigOptions<TEnv>) {
		if (this._config) {
			throw new Error("Multiplayer has already been configured.");
		}

		this._config = options;
	}

	public event<
		TEvent extends string,
		TData extends EventData
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

		/**
		 * TODO
		 * @description Create an object utility to safely merge two records with proper types
		 * @author David Lee
		 * @date August 10, 2022
		 */
		return new Multiplayer({ events: { ...events1, ...events2 } as any });
	}

	private static parseMessage(
		message: MessageEvent
	): EventMessage<string, any> | null {
		/**
		 * !HACK
		 * @description We'll only handle stringified JSONs for now
		 * @author David Lee
		 * @date August 9, 2022
		 */
		if (typeof message.data !== "string") return null;

		try {
			const config = JSON.parse(message.data);

			if (typeof config !== "object") return null;
			if (typeof config.type !== "string") return null;
			if (typeof config.data !== "object") return null;

			return config as EventMessage<string, any>;
		} catch {
			return null;
		}
	}

	public register(webSocket: WebSocket): void {
		if (!this.config) {
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

		this._sessions.push(session);

		webSocket.addEventListener("message", async (message) => {
			const config = Multiplayer.parseMessage(message);

			/**
			 * !HACK
			 * @description We'll ignore any message that doesn't return a Json
			 * for now
			 * @author David Lee
			 * @date August 10, 2022
			 */
			if (!config) return;

			const eventConfig = this.events[config.type] ?? null;

			if (!eventConfig) return;

			const input = eventConfig.input.parse(config.data);

			try {
				await Promise.resolve(
					eventConfig.resolver(input, {
						broadcast: this.broadcast,
						/* eslint-disable-next-line */
						env: this._config!.env
					})
				);
			} catch (error) {
				if (!(error instanceof Error)) {
					Multiplayer.sendMessage(webSocket, {
						type: "$ERROR_INTERNAL",
						data: {
							message: "Unexpected error",
							stack: null
						}
					});

					return;
				}

				Multiplayer.sendMessage(webSocket, {
					type: "$ERROR_INTERNAL",
					data: {
						message: error.message,
						stack: error.stack ?? null
					}
				});
			}
		});

		const closeHandler = () => {
			session.quit = true;

			this._sessions = this._sessions.filter((member) => member !== session);

			this.broadcast({
				type: "$INTERNAL_QUIT",
				data: { id: session.id }
			});
		};

		webSocket.addEventListener("close", closeHandler);
		webSocket.addEventListener("error", closeHandler);
	}

	private static sendMessage<
		TMessage extends EventMessage<string, any> = EventMessage<string, any>
	>(webSocket: WebSocket, data: TMessage): void {
		webSocket.send(JSON.stringify(data));
	}
}

export const createMultiplayer = <
	TEnv = {},
	TOutput extends EventRecord<string, any> = {}
>(): Multiplayer<TEnv, TOutput, {}> => {
	return new Multiplayer<TEnv, TOutput, {}>();
};
