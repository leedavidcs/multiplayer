import { ObjectUtils } from "@package/common-utils";
import {
	EventData,
	EventRecord,
	InputZodLike
} from "@package/multiplayer-internal";

export interface EventConfig<TData extends EventData = {}> {
	input?: InputZodLike<TData>;
}

export type InferEventConfig<
	TEvents extends EventRecord<string, any> = {}
> = {
	[P in keyof TEvents]: P extends string
		? Id<EventConfig<TEvents[P]>>
		: never;
};

export interface MultiplayerClientOptions<
	TEvents extends EventRecord<string, any> = {}
> {
	apiEndpoint: string;
	events?: InferEventConfig<TEvents>
}

export class MultiplayerClient<
	TOutput extends EventRecord<string, any> = {},
	TInput extends EventRecord<string, any> = {}
> {
	public apiEndpoint: string;
	public events: InferEventConfig<TInput>;

	constructor(options: MultiplayerClientOptions<TInput>) {
		this.apiEndpoint = options.apiEndpoint;
		this.events = options.events ?? {} as InferEventConfig<TInput>;
	}

	public event<
		TEvent extends string,
		TData extends EventData = {}
	>(
		event: TEvent,
		config: EventConfig<TData>
	): MultiplayerClient<
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
		} as InferEventConfig<EventRecord<TEvent, TData>>;

		return MultiplayerClient.merge(
			this,
			new MultiplayerClient({
				apiEndpoint: this.apiEndpoint,
				events: newEvent
			})
		);
	}

	public static merge<
		TOutputStatic extends EventRecord<string, any>,
		TInputStatic1 extends EventRecord<string, any>,
		TInputStatic2 extends EventRecord<string, any>,
	>(
		multiplayer1: MultiplayerClient<TOutputStatic, TInputStatic1>,
		multiplayer2: MultiplayerClient<TOutputStatic, TInputStatic2>
	): MultiplayerClient<TOutputStatic, Spread<[TInputStatic1, TInputStatic2]>> {
		const events1 = multiplayer1.events;
		const events2 = multiplayer2.events;

		const mergedEvents = ObjectUtils.safeAssign(events1, events2);

		return new MultiplayerClient({
			apiEndpoint: multiplayer1.apiEndpoint,
			events: mergedEvents as any
		});
	}
}

export const createClient = (
	options: MultiplayerClientOptions
): MultiplayerClient<{}, {}> => {
	return new MultiplayerClient<{}, {}>(options);
};
