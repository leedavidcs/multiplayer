import { ObjectUtils, PromiseUtils } from "@package/common-utils";
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
import {
	AbstractMultiplayerPlatform,
	InferPlatformAsync,
	InferWebSocketType
} from "./AbstractMultiplayerPlatform";
import { AbstractWebSocket } from "./AbstractWebSocket";

interface WebSocketSession<TPlatform extends Maybe<AbstractMultiplayerPlatform<any, any>> = null> {
	id: string;
	quit: boolean;
	webSocket: AbstractWebSocket<InferPlatformAsync<TPlatform>>;
}

interface EventResolverHelpers<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any, any>> = null,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {}
> {
	_platform: TPlatform;
	broadcast: (message: InferEventMessage<TOutput> | DefaultServerMessage) =>
		InferPlatformAsync<TPlatform> extends true ? Promise<void> : void;
	context: TContext;
	session: WebSocketSession<TPlatform>;
}

export type EventResolver<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any, any>> = null,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TData extends EventData = {}
> = (
	data: TData,
	helpers: EventResolverHelpers<TPlatform, TContext, TOutput>
) => InferPlatformAsync<TPlatform> extends true ? Promise<void> : void;

export interface EventConfig<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any, any>> = null,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TData extends EventData = {}
> {
	input?: InputZodLike<TData>;
	resolver: EventResolver<TPlatform, TContext, TOutput, TData>;
}

type InferEventConfig<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any, any>> = null,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TEvents extends EventRecord<string, any> = {}
> = {
	[P in keyof TEvents]: P extends string
		? Id<EventConfig<TPlatform, TContext, TOutput, TEvents[P]>>
		: never;
};

export interface MultiplayerConfigOptions<
	TContext extends Record<string, any> = {}
> {
	context: TContext;
};

export interface MultiplayerRegisterOptions<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any>> = null,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {}
> {
	middleware?: (
		helpers: EventResolverHelpers<TPlatform, TContext, TOutput>,
		next: () => void
	) => TPlatform extends AbstractMultiplayerPlatform<any, true> ? MaybePromise<void> : void;
}

export interface MultiplayerOptions<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any>> = null,
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {},
	TInput extends EventRecord<string, any> = {},
> {
	events?: InferEventConfig<TPlatform, TContext, TOutput, TInput>;
	platform?: TPlatform;
}

export class MultiplayerServer<
	TPlatform extends Maybe<AbstractMultiplayerPlatform<any>> = null,
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
		output: TOutput;
	} = {} as any;

	private _config: MultiplayerConfigOptions<TContext> | null = null;
	private _sessions = new Map<string, WebSocketSession<TPlatform>>();

	public events: InferEventConfig<TPlatform, TContext, TOutput, TInput>;
	public platform: TPlatform;

	constructor(options: MultiplayerOptions<TPlatform, TContext, TOutput, TInput>) {
		const { events, platform = null } = options;

		this.events = events
			?? {} as InferEventConfig<TPlatform, TContext, TOutput, TInput>;

		this.platform = platform as TPlatform;
	}

	public broadcast(
		message: InferEventMessage<TOutput> | DefaultServerMessage
	): InferPlatformAsync<TPlatform> extends true ? Promise<void> : void {
		const quitters: WebSocketSession<TPlatform>[] = [];

		this._sessions.forEach((session) => {
			session.quit && quitters.push(session);
		});

		quitters.forEach((session) => {
			this._sessions.delete(session.id);
		});

		const doAsync = async () => {
			await Promise.all(Array.from(this._sessions.values()).map(((session) => {
				return session.webSocket.sendMessage(message);
			})));
	
			await Promise.all(quitters.map((quitter) => {
				return this.broadcast({
					type: "$EXIT",
					data: {
						sessionId: quitter.id,
					}
				})
			}));
		};

		const doSync = () => {
			Array.from(this._sessions.values()).forEach((session) => {
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
		};

		return this.platform?.canAsync ? doAsync() : doSync() as any;
	}

	public event<
		TEvent extends string,
		TData extends EventData = {}
	>(
		event: TEvent,
		config: EventConfig<TPlatform, TContext, TOutput, TData>
	): MultiplayerServer<
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
		} as InferEventConfig<TPlatform, TContext, TOutput, EventRecord<TEvent, TData>>;

		return MultiplayerServer.merge(
			this,
			new MultiplayerServer({
				events: newEvent,
				platform: this.platform
			})
		);
	}

	public static merge<
		TPlatformStatic extends Maybe<AbstractMultiplayerPlatform<any>>,
		TContextStatic extends Record<string, any> = {},
		TOutputStatic extends EventRecord<string, any> = {},
		TInputStatic1 extends EventRecord<string, any> = {},
		TInputStatic2 extends EventRecord<string, any> = {}
	>(
		multiplayer1: MultiplayerServer<TPlatformStatic, TContextStatic, TOutputStatic, TInputStatic1>,
		multiplayer2: MultiplayerServer<TPlatformStatic, TContextStatic, TOutputStatic, TInputStatic2>
	): MultiplayerServer<TPlatformStatic, TContextStatic, TOutputStatic, Spread<[TInputStatic1, TInputStatic2]>> {
		const events1 = multiplayer1.events;
		const events2 = multiplayer2.events;

		const mergedEvents = ObjectUtils.safeAssign(events1, events2);

		return new MultiplayerServer({
			events: mergedEvents as any,
			platform: multiplayer1.platform
		});
	}

	public register(
		webSocket: InferWebSocketType<TPlatform>,
		options?: MultiplayerRegisterOptions<TPlatform, TContext, TOutput>
	): void {
		if (!this._config) {
			throw new Error(
				"Must call \"setConfig\" before registering a new WebSocket."
			);
		}

		if (!this.platform) {
			throw new Error(
				"Must provide a platform before registering a new WebSocket."
			);
		}

		const multiplayerWs = this.platform.convertWebSocket(webSocket);

		multiplayerWs.accept();

		const session: WebSocketSession<TPlatform> = {
			id: this.platform.randomUUID(),
			quit: false,
			webSocket: multiplayerWs
		};

		this._sessions.set(session.id, session);

		const helpers: EventResolverHelpers<TPlatform, TContext, TOutput> = {
			_platform: this.platform,
			broadcast: this.broadcast.bind(this),
			/* eslint-disable-next-line */
			context: this._config!.context,
			session
		};

		multiplayerWs.addEventListener("message", (message): void => {
			// Should not reach here. But handling it just in-case.
			if (session.quit) {
				multiplayerWs.close(1011, "WebSocket broken");

				return;
			}

			let goNext: boolean = false;

			const next = () => {
				goNext = true;
			};

			const middleware = options?.middleware ?? next;

			PromiseUtils.callbackify(middleware)([helpers, next], ([, middlewareErr]) => {
				if (middlewareErr) {
					multiplayerWs.handleError(middlewareErr);

					return;
				}

				if (!goNext) return;

				const rawMessage = MultiplayerInternal.parseMessage(message);

				if (!rawMessage) return;

				const eventConfig = this.events[rawMessage.type] ?? null;

				if (!eventConfig) return;
		
				let input: TInput[string];
					
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
					multiplayerWs.handleError(error, "Invalid input");
		
					return;
				}

				PromiseUtils.callbackify(eventConfig.resolver)([input, helpers], ([, resolverErr]) => {
					if (resolverErr) {
						multiplayerWs.handleError(resolverErr);
					}
				});
			});
		});

		const closeHandler = () => {
			session.quit = true;

			this._sessions.delete(session.id);

			return this.broadcast({
				type: "$EXIT",
				data: {
					sessionId: session.id,
				}
			});
		};

		multiplayerWs.addEventListener("close", closeHandler);
		multiplayerWs.addEventListener("error", closeHandler);
	}

	public setConfig(
		options: MultiplayerConfigOptions<TContext>
	): MultiplayerServer<TPlatform, TContext, TOutput, TInput> {
		this._config = options;

		return this;
	}

	public usePlatform<
		TNewPlatform extends AbstractMultiplayerPlatform<any>
	>(platform: TNewPlatform): MultiplayerServer<TNewPlatform, TContext, TOutput, TInput> {
		return new MultiplayerServer<TNewPlatform, TContext, TOutput, TInput>({
			events: this.events as any,
			platform: platform as any
		});
	}
}

export const createServer = <
	TContext extends Record<string, any> = {},
	TOutput extends EventRecord<string, any> = {}
>(): MultiplayerServer<null, TContext, TOutput, DefaultClientEventRecord> => {
	return new MultiplayerServer<null, TContext, TOutput, DefaultClientEventRecord>({
		events: {
			$PING: {
				resolver: (data, { session }) => {
					return session.webSocket.sendMessage({ type: "$PONG", data: {} });
				}
			}
		}
	});
};
