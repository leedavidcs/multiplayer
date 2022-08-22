import { TypedEventTarget } from "@package/common-utils";
import { EventRecord, GetEventMessage } from "@package/multiplayer-internal";

export class MultiplayerEventTarget<
	TInput extends EventRecord<string, any>
> extends TypedEventTarget<{ [P in keyof TInput]: GetEventMessage<TInput, P> }> {}
