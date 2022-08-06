declare type Maybe<T> = T | null | undefined;
declare type MaybePromise<T> = Promise<T> | T;
declare type MaybeReadonlyArray<T> = T[] | readonly T[];

declare type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends Array<infer U>
		? Array<DeepPartial<U>>
		: T[P] extends ReadonlyArray<infer U>
			? ReadonlyArray<DeepPartial<U>>
			: DeepPartial<T[P]>
};

declare type DeepWriteable<T> = { -readonly [P in keyof T]: DeepWriteable<T[P]> };

declare type OptionalProps<T extends Record<string, any>, K extends keyof T> =
	Omit<T, K> & Partial<Pick<T, K>>;

declare type NonNilProps<T extends Record<string, any>, K extends keyof T> =
	Omit<T, K> & { [P in K]: NonNullable<T[P]> };

declare type Json =
	| string
	| number
	| boolean
	| null
	| Json[]
	| readonly Json[]
	| { [key: string]: Json };
