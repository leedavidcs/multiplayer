import {
	EventConfig,
	EventData,
	EventMessage,
	EventRecord,
	OutputEventMessage,
	OutputRecord
} from "./types";

interface DefaultOutputRecord {
	$INTERNAL_ERROR: {
		message: string;
		stack: string | null;
	};
	$INTERNAL_QUIT: {
		id: string;
	};
}

type DefaultOutputMessage = OutputEventMessage<DefaultOutputRecord>;

interface WebSocketSession {
	id: string;
	quit: boolean;
	webSocket: WebSocket;
}

export interface MultiplayerOptions<
	TEnv,
	TEvents extends EventRecord<TEnv, string, any>
> {
	events?: TEvents;
}

export class Multiplayer<
	TEnv,
	TOutput extends OutputRecord<string, any> = {},
	TEvents extends EventRecord<TEnv, string, any> = {}
> {
	public events: TEvents;
	private sessions: WebSocketSession[] = [];

	constructor(options: MultiplayerOptions<TEnv, TEvents> = {}) {
		this.events = options.events ?? {} as TEvents;
	}

	public broadcast(
		message: OutputEventMessage<TOutput> | DefaultOutputMessage
	): void {
		const { stayers, quitters } = this.sessions.reduce(
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

		this.sessions = stayers;

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

	public event<
		TEvent extends string,
		TData extends EventData
	>(
		event: TEvent,
		config: EventConfig<TEnv, TData>
	): Multiplayer<TEnv, TOutput, Spread<[TEvents, EventRecord<TEnv, TEvent, TData>]>> {
		if (event.startsWith("$")) {
			throw new Error("Event name must not start with \"$\".");
		}

		const newEvent = { [event]: config } as EventRecord<TEnv, TEvent, TData>;

		return Multiplayer.merge(this, new Multiplayer({ events: newEvent }));
	}

	public static merge<
		TEnvStatic,
		TOutputStatic extends OutputRecord<string, any>,
		TEventsStatic1 extends EventRecord<TEnvStatic, string, any>,
		TEventsStatic2 extends EventRecord<TEnvStatic, string, any>
	>(
		multiplayer1: Multiplayer<TEnvStatic, TOutputStatic, TEventsStatic1>,
		multiplayer2: Multiplayer<TEnvStatic, TOutputStatic, TEventsStatic2>
	): Multiplayer<TEnvStatic, TOutputStatic, Spread<[TEventsStatic1, TEventsStatic2]>> {
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

	public register(webSocket: WebSocket, env: TEnv): void {
		webSocket.accept();

		const session: WebSocketSession = {
			id: crypto.randomUUID(),
			quit: false,
			webSocket
		};

		this.sessions.push(session);

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
						env
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

			this.sessions = this.sessions.filter((member) => member !== session);

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
	TOutput extends OutputRecord<string, any> = {}
>(): Multiplayer<TEnv, TOutput, {}> => {
	return new Multiplayer<TEnv, TOutput, {}>();
};
