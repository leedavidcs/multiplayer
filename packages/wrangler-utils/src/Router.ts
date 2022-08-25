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

export interface RouterConfigOptions<TContext> {
	context: TContext;
}

export interface RouterOptions<
	TContext,
	TPaths extends RouterPathRecord<TContext, string, any>
> {
	paths?: TPaths;
}

export class Router<TContext, TPaths extends RouterPathRecord<TContext, string, any> = {}> {
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

	public config(options: RouterConfigOptions<TContext>): Router<TContext, TPaths> {
		if (this._config) {
			throw new Error("Router has already been configured");
		}

		this._config = options;

		return this;
	}

	public async match(request: Request): Promise<Response> {
		if (!this._config) {
			throw new Error(
				"Must call \"config\" before matching a new request."
			);
		}

		const url = new URL(request.url);
		const patterns = Object.keys(this.paths);
		const matchedPattern = patterns.find((pattern) => !!match(pattern)(url.pathname));

		if (!matchedPattern) return new Response("Not found", { status: 404 });

		const matched = match(matchedPattern)(url.pathname);

		if (!matched) return new Response("Not found", { status: 404 });

		const handler = this.paths[matchedPattern];
		const params = matched.params;

		if (!handler) return new Response("Not found", { status: 404 });

		return await handler(params, {
			context: this._config.context,
			request
		}) ?? new Response("OK", { status: 200 });
	}

	public static merge<
		TContextStatic,
		TPathsStatic1 extends RouterPathRecord<TContextStatic, string, any>,
		TPathsStatic2 extends RouterPathRecord<TContextStatic, string, any>
	>(
		router1: Router<TContextStatic, TPathsStatic1>,
		router2: Router<TContextStatic, TPathsStatic2>
	): Router<TContextStatic, Spread<[TPathsStatic1, TPathsStatic2]>> {
		const paths1 = router1.paths;
		const paths2 = router2.paths;

		/**
		 * TODO
		 * @description Create an object utility to safely merge two records with proper types
		 * @author David Lee
		 * @date August 8, 2022
		 */
		return new Router({ paths: { ...paths1, ...paths2 } as any });
	}

	public path<TPath extends string>(
		pattern: TPath,
		handler: RouterPathHandler<TContext, Id<PathParams<TPath>>>
	): Router<TContext, Spread<[TPaths, RouterPathRecord<TContext, TPath, PathParams<TPath>>]>> {
		const newPath = { [pattern]: handler } as RouterPathRecord<TContext, TPath, PathParams<TPath>>;

		return Router.merge(this, new Router({ paths: newPath }));
	}
}

export const createRouter = <TContext = {}>(): Router<TContext, {}> => {
	return new Router<TContext>();
};
