interface DefaultServerEventRecord {
	$ERROR: {
		message: string;
		stack?: string | null;
	};
	$ENTER_ROOM: {
		roomId?: string | null;
	};
	$EXIT_ROOM: {
		connectionId: string;
		roomId: string;
	};
}

export type DefaultOutputMessage = InferInternalEventMessage<
	DefaultServerEventRecord
>;

export type EventData = Record<string, Json>;

export interface RoomEventMessage<
	TEvent extends string,
	TData extends EventData
> {
	data: TData;
	roomId: string;
	type: TEvent;
}

export interface InternalEventMessage<
	TEvent extends string,
	TData extends EventData
> {
	data: TData;
	type: TEvent;
}

export type EventMessage<
	TEvent extends string,
	TData extends EventData
> =
	| RoomEventMessage<TEvent, TData>
	| InternalEventMessage<TEvent, TData>
;

export type EventRecord<
	TEvent extends string,
	TData extends EventData
> = { [key in `${TEvent}`]: TData };

export type Infer<TMultiplayer extends MultiplayerLike<any>> =
	TMultiplayer extends MultiplayerLike<infer TInput>
		? TInput
		: never;


// Messages outputed by the server WebSockets
export type InferEventMessage<
	TEvents extends EventRecord<string, any>
> = {
	[P in keyof TEvents]: P extends string
		? Id<Omit<EventMessage<P, TEvents[P]>, keyof DefaultServerEventRecord>>
		: never;
}[keyof TEvents];

// Messages outputed by the server WebSockets
export type InferInternalEventMessage<
	TEvents extends EventRecord<string, any>
> = {
	[P in keyof TEvents]: P extends string
		? Id<InternalEventMessage<P, TEvents[P]>>
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
