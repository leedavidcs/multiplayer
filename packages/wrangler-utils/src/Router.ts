import { match } from "path-to-regexp";

type PathParamRecord<
	TParamName extends string,
	TParamValue extends string | string[] = string
> = { [key in `${TParamName}`]: TParamValue };

export type PathParams<T extends string> = T extends string
	? T extends `/:${infer IFullParam}`
		? IFullParam extends `${infer IParamName}/${infer IRestParam}`
			? Spread<[PathParamRecord<IParamName>, PathParams<`/${IRestParam}`>]>
			: IFullParam extends `${infer IParamName}${'+' | '*'}`
				? PathParamRecord<IParamName, string[]>
				: PathParamRecord<IFullParam>
		: T extends `/${infer IFullPath}`
			? IFullPath extends `${string}/${infer IRestParam}`
				? PathParams<`/${IRestParam}`>
				: {}
			: {}
	: `Error: Could not resolve path: ${T}`;

interface RouterPathHandlerHelpers<TContext> {
	context: TContext;
	request: Request;
}

type RouterPathHandler<TContext, T extends PathParamRecord<string, any>> = (
	params: Id<T>,
	helpers: RouterPathHandlerHelpers<TContext>
) => Promise<Response> | Response | void;

type RouterPathRecord<
	TContext,
	TPathName extends string,
	TPathParams extends PathParams<TPathName>
> = Record<TPathName, RouterPathHandler<TContext, Id<TPathParams>>>;

type RouterMethod =
	| "all"
	| "connect"
	| "delete"
	| "get"
	| "head"
	| "options"
	| "patch"
	| "post"
	| "put"
	| "trace";

type RouterPathTuple<
	TContext,
	TMethod extends RouterMethod,
	TPathName extends string,
	TPathParams extends PathParams<TPathName>
> = readonly [
	method: TMethod,
	path: TPathName,
	handler: RouterPathHandler<TContext, Id<TPathParams>>
];

type RouterPaths<
	TContext,
	TMethod extends RouterMethod,
	TPathName extends string,
	TPathParams extends PathParams<TPathName>
> = readonly RouterPathTuple<TContext, TMethod, TPathName, TPathParams>[];

export interface RouterConfigOptions<TContext> {
	context: TContext;
}

export interface RouterOptions<
	TContext,
	TPaths extends RouterPaths<TContext, any, string, any>
> {
	paths?: TPaths;
}

export class Router<
	TContext,
	TPaths extends RouterPaths<TContext, any, string, any> = []
> {
	private _config: RouterConfigOptions<TContext> | null = null;
	
	/**
	 * !HACK
	 * @description We're relying on a non-guaranteed property of objects, with
	 * spreads to preserve the spread-order of keys for iterating. This probably
	 * should be rewritten to use an array to ensure pattern-matching order.
	 * @author David Lee
	 * @date August 8, 2022
	 */
	public paths: TPaths;

	constructor(options: RouterOptions<TContext, TPaths> = {}) {
		this.paths = options.paths ?? {} as TPaths;
	}

	public async match(request: Request): Promise<Response> {
		if (!this._config) {
			throw new Error(
				"Must call \"config\" before matching a new request."
			);
		}

		const url = new URL(request.url);

		const matchedPath = this.paths.find(([method, pattern]) => {
			const isMethodMatch = this._compareMethods(request.method, method) || method === "all";

			return isMethodMatch && !!match(pattern)(url.pathname);
		});

		if (!matchedPath) return new Response("Not found", { status: 404 });

		const [, matchedPattern, handler] = matchedPath;

		const matched = match(matchedPattern)(url.pathname);

		if (!matched) return new Response("Not found", { status: 404 });

		const params = matched.params;

		return await handler(params, {
			context: this._config.context,
			request
		}) ?? new Response("OK", { status: 200 });
	}

	public static merge<
		TContextStatic,
		TPathsStatic1 extends RouterPaths<TContextStatic, any, string, any>,
		TPathsStatic2 extends RouterPaths<TContextStatic, any, string, any>
	>(
		router1: Router<TContextStatic, TPathsStatic1>,
		router2: Router<TContextStatic, TPathsStatic2>
	): Router<TContextStatic, [...TPathsStatic1, ...TPathsStatic2]> {
		const paths1 = router1.paths;
		const paths2 = router2.paths;

		/**
		 * TODO
		 * @description Create an object utility to safely merge two records with proper types
		 * @author David Lee
		 * @date August 8, 2022
		 */
		return new Router({ paths: [...paths1, ...paths2] });
	}

	public path<TMethod extends RouterMethod, TPath extends string>(
		method: TMethod,
		pattern: TPath,
		handler: RouterPathHandler<TContext, Id<PathParams<TPath>>>
	): Router<TContext, [...TPaths, ...RouterPaths<TContext, TMethod, TPath, PathParams<TPath>>]> {
		const newPath = [
			[method, pattern, handler]
		] as RouterPaths<TContext, TMethod, TPath, PathParams<TPath>>;

		return Router.merge(this, new Router({ paths: newPath }));
	}

	public setConfig(options: RouterConfigOptions<TContext>): Router<TContext, TPaths> {
		if (this._config) {
			throw new Error("Router has already been configured");
		}

		this._config = options;

		return this;
	}

	private _compareMethods(method1: string, method2: string): boolean {
		return method1.toLowerCase() === method2.toLowerCase();
	}
}

export const createRouter = <TContext = {}>(): Router<TContext, []> => {
	return new Router<TContext>();
};
