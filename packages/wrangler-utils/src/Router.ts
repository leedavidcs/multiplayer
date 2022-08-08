import { match } from "path-to-regexp";

type PathParamRecord<
	TParamName extends string,
	TParamValue extends string | string[] = string
> = { [key in `${TParamName}`]: TParamValue };

export type PathParams<T extends string> =	T extends string
	? T extends `/:${infer IFullParam}`
		? IFullParam extends `${infer IParamName}/${infer IRestParam}`
			? Spread<[PathParamRecord<IParamName>, PathParams<`/${IRestParam}`>]>
			: IFullParam extends `${infer IParamName}+`
				? PathParamRecord<IParamName, string[]>
				: PathParamRecord<IFullParam>
	: T extends `/${infer IFullPath}`
		? IFullPath extends `${string}/${infer IRestParam}`
			? PathParams<`/${IRestParam}`>
			: {}
		: {}
	: `Error: Could not resolve path: ${T}`

type RouterPathHandler<T extends PathParamRecord<string, any>> =
	(params: AsObject<T>, request: Request) => Promise<Response> | Response | void;

type RouterPathRecord<
	TPathName extends string,
	TPathParams extends PathParams<TPathName>
> = Record<TPathName, RouterPathHandler<TPathParams>>;

export interface RouterOptions<TPaths extends RouterPathRecord<string, any>> {
	paths?: TPaths;
}

export class Router<TPaths extends RouterPathRecord<string, any> = {}> {
	/**
	 * !HACK
	 * @description We're relying on a non-guaranteed property of objects, with
	 * spreads to preserve the spread-order of keys for iterating. This probably
	 * should be rewritten to use an array to ensure pattern-matching order.
	 * @author David Lee
	 * @date August 8, 2022
	 */
	public paths: TPaths = {} as TPaths;

	constructor(options: RouterOptions<TPaths> = {}) {
		this.paths = options.paths ?? {} as TPaths;
	}

	public static merge<
		TPaths1 extends RouterPathRecord<string, any>,
		TPaths2 extends RouterPathRecord<string, any>
	>(
		router1: Router<TPaths1>,
		router2: Router<TPaths2>
	): Router<Spread<[TPaths1, TPaths2]>> {
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
		handler: RouterPathHandler<PathParams<TPath>>
	): Router<Spread<[TPaths, RouterPathRecord<TPath, PathParams<TPath>>]>> {
		const newPath = { [pattern]: handler } as RouterPathRecord<TPath, PathParams<TPath>>;

		return Router.merge(this, new Router({ paths: newPath }));
	}

	public async match(request: Request): Promise<Response> {
		const url = new URL(request.url);

		const patterns = Object.keys(this.paths);

		const matchedPattern = patterns.find((pattern) => !!match(pattern)(url.pathname));

		if (!matchedPattern) {
			return new Response("OK", { status: 200 });
		}

		const matched = match(matchedPattern)(url.pathname);

		if (!matched) {
			return new Response("OK", { status: 200 });
		}

		const handler = this.paths[matchedPattern];
		const params = matched.params;

		if (!handler) {
			return new Response("OK", { status: 200 });
		}

		const response = await handler(params, request);

		return response ?? new Response("OK", { status: 200 });
	}
}

export const router = (): Router<{}> => {
	return new Router();
};
