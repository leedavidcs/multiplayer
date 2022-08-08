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
		? IFullPath extends `${infer IPathSlug}/${infer IRestParam}`
			? PathParams<`/${IRestParam}`>
			: {}
		: {}
	: `Error: Could not resolve path: ${T}`

export class Router {
	public static path<TPath extends string>(
		pattern: TPath,
		handler: (params: PathParams<TPath>
	) => Promise<void>) {
		
	}
}
