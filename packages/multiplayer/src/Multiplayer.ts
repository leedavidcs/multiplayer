export type EventData = Record<string, Json>;

interface EventMessage<
	TEvent extends string,
	TData extends EventData
> {
	data: TData;
	type: TEvent;
}

export type InputZodLike<TData extends EventData> = {
	_input: TData;
	parse: (data: unknown) => TData;
}

export interface EventResolverHelpers<
	TEnv,
	TOutput extends OutputRecord<string, any> = {}
> {
	broadcast: (message: OutputEventMessage<TOutput>) => void;
	env: TEnv;
}

export type EventResolver<
	TEnv,
	TData extends EventData = {},
	TOutput extends OutputRecord<string, any> = {}
> = (data: TData, helpers: EventResolverHelpers<TEnv, TOutput>) => void;

export interface EventConfig<TEnv, TData extends EventData = {}> {
	input: InputZodLike<TData>;
	resolver: EventResolver<TEnv, TData>;
}

export type EventRecord<
	TEnv,
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: EventConfig<TEnv, TData> };

export type OutputRecord<
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: TData };

// Messages outputed by the server WebSockets
type OutputEventMessage<
	TOutput extends OutputRecord<string, any>
> = {
	[P in keyof TOutput]: P extends string
		? Id<EventMessage<P, TOutput[P]>>
		: never;
}[keyof TOutput];

interface WebSocketSession {
	quit: boolean;
	id: string;
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

	public broadcast(message: OutputEventMessage<TOutput>): void {
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
			/**
			 * TODO
			 * @description Broadcast the sessions that closed
			 * @author David Lee
			 * @date August 11, 2022
			 */
		});
	}

	public event<
		TEvent extends string,
		TData extends EventData
	>(
		event: TEvent,
		config: EventConfig<TEnv, TData>
	): Multiplayer<TEnv, TOutput, Spread<[TEvents, EventRecord<TEnv, TEvent, TData>]>> {
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
		const session: WebSocketSession = {
			quit: false,
			/**
			 * TODO
			 * @description Figure out how we should handle ids per session
			 * @author David Lee
			 * @date August 11, 2022
			 */
			id: "",
			webSocket
		};

		webSocket.accept();

		webSocket.addEventListener("message", (message) => {
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

			eventConfig.resolver(input, {
				broadcast: this.broadcast,
				env
			});
		});

		const closeHandler = () => {
			session.quit = true;

			this.sessions = this.sessions.filter((member) => member !== session);

			/**
			 * TODO
			 * @description Broadcast that this session has closed
			 * @author David Lee
			 * @date August 11, 2022
			 */
		};

		this.sessions.push(session);
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
