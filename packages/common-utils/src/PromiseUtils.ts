export type CallbackParam<T> = [result: T, error: null] | [result: null, error: Error];

export class PromiseUtils {
	public static callbackify<
		T extends (...args: any[]) => MaybePromise<any>
	>(fn: T): ((args: Parameters<T>, callback: (param: CallbackParam<ReturnType<T>>) => void) => void) {
		return (args: Parameters<T>, callback: (param: CallbackParam<ReturnType<T>>) => void) => {
			let maybePromise: MaybePromise<ReturnType<T>>;
			
			try {
				maybePromise = fn(...args);
			} catch (e) {
				callback([null, e instanceof Error ? e : new Error()]);

				return;
			}

			PromiseUtils.isPromise(maybePromise)
				? maybePromise
					.then((value) => callback([value, null]))
					.catch((e) => callback([null, e instanceof Error ? e : new Error()]))
				: callback([maybePromise, null]);
		};
	};

	public static isPromise(value: any): value is Promise<any> {
		return typeof value === "object" && typeof value.then === "function";
	};
}