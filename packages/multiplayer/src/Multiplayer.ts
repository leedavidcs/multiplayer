export type EventData = Record<string, Json>;

export type InputZodLike<TData extends EventData> = {
	_input: TData;
	parse: (data: unknown) => TData;
}

export type EventResolver<
	TEnv,
	TData extends EventData = {}
> = (data: TData, env: TEnv) => void;

export interface EventConfig<TEnv, TData extends EventData = {}> {
	input: InputZodLike<TData>;
	resolver: EventResolver<TEnv, TData>;
}

export type EventRecord<
	TEnv,
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: EventConfig<TEnv, TData> };

export interface MultiplayerOptions<
	TEnv,
	TEvents extends EventRecord<TEnv, string, any>
> {
	events?: TEvents;
}

export class Multiplayer<TEnv, TEvents extends EventRecord<TEnv, string, any> = {}> {
	public events: TEvents;

	constructor(options: MultiplayerOptions<TEnv, TEvents> = {}) {
		this.events = options.events ?? {} as TEvents;
	}

	public event<
		TEvent extends string,
		TData extends EventData
	>(
		event: TEvent,
		config: EventConfig<TEnv, TData>
	): Multiplayer<TEnv, Spread<[TEvents, EventRecord<TEnv, TEvent, TData>]>> {
		const newEvent = { [event]: config } as EventRecord<TEnv, TEvent, TData>;

		return Multiplayer.merge(this, new Multiplayer({ events: newEvent }));
	}

	public static merge<
		TEnvStatic,
		TEventsStatic1 extends EventRecord<TEnvStatic, string, any>,
		TEventsStatic2 extends EventRecord<TEnvStatic, string, any>
	>(
		multiplayer1: Multiplayer<TEnvStatic, TEventsStatic1>,
		multiplayer2: Multiplayer<TEnvStatic, TEventsStatic2>
	): Multiplayer<TEnvStatic, Spread<[TEventsStatic1, TEventsStatic2]>> {
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
}

export const createMultiplayer = <TEnv = {}>(): Multiplayer<TEnv, {}> => {
	return new Multiplayer<TEnv>();
};
