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

type RouterPathHandler<TEnv, T extends PathParamRecord<string, any>> =
	(params: Id<T>, request: Request, env: TEnv) => Promise<Response> | Response | void;

type RouterPathRecord<
	TEnv,
	TPathName extends string,
	TPathParams extends PathParams<TPathName>
> = Record<TPathName, RouterPathHandler<TEnv, Id<TPathParams>>>;

export interface RouterOptions<TEnv, TPaths extends RouterPathRecord<TEnv, string, any>> {
	paths?: TPaths;
}

export class Router<TEnv, TPaths extends RouterPathRecord<TEnv, string, any> = {}> {
	/**
	 * !HACK
	 * @description We're relying on a non-guaranteed property of objects, with
	 * spreads to preserve the spread-order of keys for iterating. This probably
	 * should be rewritten to use an array to ensure pattern-matching order.
	 * @author David Lee
	 * @date August 8, 2022
	 */
	public paths: TPaths;

	constructor(options: RouterOptions<TEnv, TPaths> = {}) {
		this.paths = options.paths ?? {} as TPaths;
	}

	public async match(request: Request, env: TEnv): Promise<Response> {
		const url = new URL(request.url);
		const patterns = Object.keys(this.paths);
		const matchedPattern = patterns.find((pattern) => !!match(pattern)(url.pathname));

		if (!matchedPattern) return new Response("Not found", { status: 404 });

		const matched = match(matchedPattern)(url.pathname);

		if (!matched) return new Response("Not found", { status: 404 });

		const handler = this.paths[matchedPattern];
		const params = matched.params;

		if (!handler) return new Response("Not found", { status: 404 });

		return await handler(params, request, env) ?? new Response("OK", { status: 200 });
	}

	public static merge<
		TEnvStatic,
		TPathsStatic1 extends RouterPathRecord<TEnvStatic, string, any>,
		TPathsStatic2 extends RouterPathRecord<TEnvStatic, string, any>
	>(
		router1: Router<TEnvStatic, TPathsStatic1>,
		router2: Router<TEnvStatic, TPathsStatic2>
	): Router<TEnvStatic, Spread<[TPathsStatic1, TPathsStatic2]>> {
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
		handler: RouterPathHandler<TEnv, Id<PathParams<TPath>>>
	): Router<TEnv, Spread<[TPaths, RouterPathRecord<TEnv, TPath, PathParams<TPath>>]>> {
		const newPath = { [pattern]: handler } as RouterPathRecord<TEnv, TPath, PathParams<TPath>>;

		return Router.merge(this, new Router({ paths: newPath }));
	}
}

export const createRouter = <TEnv = {}>(): Router<TEnv, {}> => {
	return new Router<TEnv>();
};
