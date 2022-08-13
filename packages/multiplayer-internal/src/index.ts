interface DefaultServerEventRecord {
	$INTERNAL_ERROR: {
		message: string;
		stack: string | null;
	};
	$INTERNAL_QUIT: {
		id: string;
	};
}

export type DefaultOutputMessage = InferEventMessage<
	DefaultServerEventRecord
>;

export type EventData = Record<string, Json>;

export interface EventMessage<
	TEvent extends string,
	TData extends EventData
> {
	data: TData;
	type: TEvent;
}

export type EventRecord<
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: TData };

export type InputZodLike<TData extends EventData> = {
	_input: TData;
	parse: (data: unknown) => TData;
}

// Messages outputed by the server WebSockets
export type InferEventMessage<
	TEvents extends EventRecord<string, any>
> = {
	[P in keyof TEvents]: P extends string
		? Id<EventMessage<P, TEvents[P]>>
		: never;
}[keyof TEvents];

export interface MultiplayerLike<TInput extends EventRecord<string, any>> {
	_def: {
		input: TInput;
	};
}

export type Infer<TMultiplayer extends MultiplayerLike<any>> =
	TMultiplayer extends MultiplayerLike<infer TInput>
		? TInput
		: never;
