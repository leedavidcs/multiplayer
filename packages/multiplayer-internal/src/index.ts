interface DefaultServerEventRecord {
	$ERROR: {
		message: string;
		stack?: string | null;
	};
	$EXIT: {
		sessionId: string;
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
};

export type EventRecord<
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: TData };

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

interface MultiplayerLike<TInput extends EventRecord<string, any>> {
	_def: {
		input: TInput;
	};
}
