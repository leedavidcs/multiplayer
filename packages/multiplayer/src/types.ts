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
export type OutputEventMessage<
	TOutput extends OutputRecord<string, any>
> = {
	[P in keyof TOutput]: P extends string
		? Id<EventMessage<P, TOutput[P]>>
		: never;
}[keyof TOutput];
