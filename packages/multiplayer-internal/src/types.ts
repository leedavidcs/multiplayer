export interface DefaultClientEventRecord {
	$PING: {}
}

export type DefaultClientMessage = InferEventMessage<
	DefaultClientEventRecord
>;

export interface DefaultServerEventRecord {
	$ERROR: {
		message: string;
		stack?: string | null;
	};
	$EXIT: {
		sessionId: string;
	};
	$PONG: {}
}

export type DefaultServerMessage = InferEventMessage<
	DefaultServerEventRecord
>;

export type EventData = Record<string, Json>;

export interface EventMessage<
	TEvent extends string,
	TData extends EventData = {}
> {
	data: TData;
	type: TEvent;
};

export type EventRecord<
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: TData };

export type GetEventMessage<
	T extends EventRecord<string, any>,
	TEvent extends keyof T
> = TEvent extends string
	? EventMessage<TEvent, T[TEvent]>
	: never;

export type Infer<TMultiplayer extends MultiplayerLike<any>> =
	TMultiplayer extends MultiplayerLike<infer TInput>
		? TInput
		: never;

export type InferEventMessage<
	TEvents extends EventRecord<string, any>
> = {
	[P in keyof TEvents]: P extends string
		? Id<Omit<EventMessage<P, TEvents[P]>, keyof DefaultServerEventRecord>>
		: never;
}[keyof TEvents];

export type InputZodLike<TData extends EventData> = {
	_input: TData;
	parse: (data: unknown) => TData;
}

export interface MultiplayerLike<TInput extends EventRecord<string, any> = {}> {
	_def: {
		input: TInput;
	};
}
