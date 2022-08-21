declare type Maybe<T> = T | null | undefined;
declare type MaybePromise<T> = Promise<T> | T;
declare type MaybeReadonlyArray<T> = T[] | readonly T[];

type OptionalPropertyNames<T> =
	{ [K in keyof T]-?: ({} extends { [P in K]: T[K] } ? K : never) }[keyof T];

type SpreadProperties<L, R, K extends keyof L & keyof R> =
	{ [P in K]: L[P] | Exclude<R[P], undefined> };

type Id<T> = T extends infer U ? { [K in keyof U]: U[K] } : never

type SpreadTwo<L, R> = Id<
	& Pick<L, Exclude<keyof L, keyof R>>
	& Pick<R, Exclude<keyof R, OptionalPropertyNames<R>>>
	& Pick<R, Exclude<OptionalPropertyNames<R>, keyof L>>
	& SpreadProperties<L, R, OptionalPropertyNames<R> & keyof L>
>;

declare type Spread<A extends readonly [...any]> = A extends [infer L, ...infer R]
	? SpreadTwo<L, Spread<R>>
	: unknown;

declare type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Array<infer U>
		? Array<DeepPartial<U>>
		: T[P] extends ReadonlyArray<infer U>
			? ReadonlyArray<DeepPartial<U>>
			: DeepPartial<T[P]>
};

declare type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

declare type OptionalProps<T extends Record<string, any>, K extends keyof T = keyof T> =
	Omit<T, K> & Partial<Pick<T, K>>;

declare type NonNilProps<T extends Record<string, any>, K extends keyof T = keyof T> =
	Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };

declare type Json =
	| string
	| number
	| boolean
	| null
	| Json[]
	| readonly Json[]
	| { [key: string]: Json };
