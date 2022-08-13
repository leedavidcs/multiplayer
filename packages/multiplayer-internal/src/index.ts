export type EventData = Record<string, Json>;

export interface EventMessage<
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

// Messages outputed by the server WebSockets
export type OutputEventMessage<
	TOutput extends OutputRecord<string, any>
> = {
	[P in keyof TOutput]: P extends string
		? Id<EventMessage<P, TOutput[P]>>
		: never;
}[keyof TOutput];

export type OutputRecord<
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: TData };
