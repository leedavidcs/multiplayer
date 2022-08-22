export class LangUtils {
	public static isNil<T>(value: T): value is NonNullable<T> {
		return value !== null && typeof value !== "undefined";
	}
}
