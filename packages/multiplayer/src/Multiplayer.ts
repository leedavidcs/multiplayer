import { ObjectUtils } from "@package/common-utils";
import {
	DefaultClientEventRecord,
	DefaultServerMessage,
	EventData,
	EventRecord,
	InferEventMessage,
	InputZodLike,
	MultiplayerInternal,
	MultiplayerLike
} from "@package/multiplayer-internal";
import { AbstractMultiplayerPlatform } from "./AbstractMultiplayerPlatform";
import {
	AbstractMessageEvent,
	AbstractWebSocket
} from "./AbstractWebSocket";

interface WebSocketSession {
	id: string;
	quit: boolean;
	webSocket: AbstractWebSocket;
}

interface EventResolverHelpers<
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {}
> {
	broadcast: (message: InferEventMessage<TOutput> | DefaultServerMessage) => void;
	context: TContext;
	session: WebSocketSession;
}

export type EventResolver<
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TData extends EventData = {}
> = (data: TData, helpers: EventResolverHelpers<TContext, TOutput>) => void;

export interface EventConfig<
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TData extends EventData = {}
> {
	input?: InputZodLike<TData>;
	resolver: EventResolver<TContext, TOutput, TData>;
}

type InferEventConfig<
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TEvents extends EventRecord<string, any> = {}
> = {
	[P in keyof TEvents]: P extends string
		? Id<EventConfig<TContext, TOutput, TEvents[P]>>
		: never;
};

export interface MultiplayerConfigOptions<
	TContext extends Record<string, any> = {}
> {
	context: TContext;
};

export interface MultiplayerRegisterOptions<
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {}
> {
	middleware?: (
		helpers: EventResolverHelpers<TContext, TOutput>,
		next: () => void
	) => MaybePromise<void>;
}

export interface MultiplayerOptions<
	TPlatform extends AbstractMultiplayerPlatform,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TInput extends EventRecord<string, any> = {},
> {
	events?: InferEventConfig<TContext, TOutput, TInput>;
	platform: TPlatform;
}

export class Multiplayer<
	TPlatform extends AbstractMultiplayerPlatform,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TInput extends EventRecord<string, any> = {}
> implements MultiplayerLike<TInput> {
	/**
	 * !HACK
	 * @description This is only used for type inferences in a generic way
	 * @author David Lee
	 * @date August 13, 2022
	 */
	readonly _def: {
		input: TInput;
	} = {} as any;

	private _config: MultiplayerConfigOptions<TContext> | null = null;
	private _sessions = new Map<string, WebSocketSession>();

	public events: InferEventConfig<TContext, TOutput, TInput>;
	public platform: TPlatform;

	constructor(options: MultiplayerOptions<TPlatform, TContext, TOutput, TInput>) {
		this.events = options.events
			?? {} as InferEventConfig<TContext, TOutput, TInput>;

		this.platform = options.platform;
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
			session.webSocket.sendMessage(message);
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
		options: MultiplayerConfigOptions<TContext>
	): Multiplayer<TPlatform, TContext, TOutput, TInput> {
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
		config: EventConfig<TContext, TOutput, TData>
	): Multiplayer<
		TPlatform,
		TContext,
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
		} as InferEventConfig<TContext, TOutput, EventRecord<TEvent, TData>>;

		return Multiplayer.merge(this, new Multiplayer({ events: newEvent, platform: this.platform }));
	}

	public static merge<
		TPlatformStatic extends AbstractMultiplayerPlatform,
		TContextStatic extends Record<string, any> = {},
		TOutputStatic extends EventRecord<string, any> = {},
		TInputStatic1 extends EventRecord<string, any> = {},
		TInputStatic2 extends EventRecord<string, any> = {}
	>(
		multiplayer1: Multiplayer<TPlatformStatic, TContextStatic, TOutputStatic, TInputStatic1>,
		multiplayer2: Multiplayer<TPlatformStatic, TContextStatic, TOutputStatic, TInputStatic2>
	): Multiplayer<TPlatformStatic, TContextStatic, TOutputStatic, Spread<[TInputStatic1, TInputStatic2]>> {
		const events1 = multiplayer1.events;
		const events2 = multiplayer2.events;

		const mergedEvents = ObjectUtils.safeAssign(events1, events2);

		return new Multiplayer({
			events: mergedEvents as any,
			platform: multiplayer1.platform
		});
	}

	protected _register(
		webSocket: AbstractWebSocket,
		options?: MultiplayerRegisterOptions<TContext, TOutput>
	): void {
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

		this._sessions.set(session.id, session);

		const helpers: EventResolverHelpers<TContext, TOutput> = {
			broadcast: this.broadcast,
			/* eslint-disable-next-line */
			context: this._config!.context,
			session
		};

		webSocket.addEventListener("message", async (message) => {
			// Should not reach here. But handling it just in-case.
			if (session.quit) {
				webSocket.close(1011, "WebSocket broken");

				return;
			}

			let goNext: boolean = false;

			const next = () => {
				goNext = true;
			};

			try {
				options?.middleware
					? await Promise.resolve(options.middleware(helpers, next))
					: next();
			} catch (error) {
				webSocket.handleError(error);
	
				return;
			}

			if (!goNext) return;

			const rawMessage = MultiplayerInternal.parseMessage(message as AbstractMessageEvent);

			/**
			 * !HACK
			 * @description We'll ignore any message that doesn't return a Json
			 * for now
			 * @author David Lee
			 * @date August 10, 2022
			 */
			if (!rawMessage) return;

			const eventConfig = this.events[rawMessage.type] ?? null;

			if (!eventConfig) return;
	
			let input: TInput[string]
	
			try {
				input = eventConfig.input?.parse(rawMessage.data) ??
					/**
					 * !HACK
					 * @description Config doesn't specify validation. Just return {}
					 * instead in the resolver.
					 * @author David Lee
					 * @date August 13, 2022
					 */
					{} as TInput[string];
			} catch(error) {
				webSocket.handleError(error, "Invalid input");
	
				return;
			}
	
			try {
				await Promise.resolve(eventConfig.resolver(input, helpers));
			} catch (error) {
				webSocket.handleError(error);
			}
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
}

export interface CreateMultiplayerOptions<
	TPlatform extends AbstractMultiplayerPlatform
> {
	platform: TPlatform;
}

export const createMultiplayer = <
	TPlatform extends AbstractMultiplayerPlatform,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {}
>(
	options: CreateMultiplayerOptions<TPlatform>
): Multiplayer<TPlatform, TContext, TOutput, DefaultClientEventRecord> => {
	const { platform } = options;

	return new Multiplayer<TPlatform, TContext, TOutput, DefaultClientEventRecord>({
		events: {
			$PING: {
				resolver: (data, { broadcast }) => {
					broadcast({ type: "$PONG", data: {} });
				}
			}
		},
		platform
	});
};
