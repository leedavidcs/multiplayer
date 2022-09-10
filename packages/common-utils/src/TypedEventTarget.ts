import type { TypedEvent } from "./TypedEvent";

export interface TypedEventListener<TEvent extends TypedEvent> extends EventListener {
	(event: TEvent): void
}

export interface TypedEventListenerObject<TEvent extends TypedEvent> extends EventListener {
	handleEvent(object: TEvent): void
}

export type TypedEventListenerOrEventListenerObject<TEvent extends TypedEvent> =
	TypedEventListener<TEvent> | TypedEventListenerObject<TEvent>;

export type TypedEventMap = Record<string, any>;

export interface TypedEventTarget<TEventMap extends TypedEventMap> extends EventTarget {
	addEventListener<TName extends keyof TEventMap>(
		type: TName,
		callback: TypedEventListenerOrEventListenerObject<TypedEvent<TEventMap[TName]>>,
		options?: AddEventListenerOptions | boolean
	): void;

	dispatchEvent(event: TypedEvent<TEventMap[keyof TEventMap]>): boolean;

	removeEventListener<TName extends keyof TEventMap>(
		type: TName,
		callback: TypedEventListenerOrEventListenerObject<TypedEvent<TEventMap[TName]>>,
		options?: EventListenerOptions | boolean
	): void;
}

export class TypedEventTarget<TEventMap extends TypedEventMap> extends EventTarget {}
