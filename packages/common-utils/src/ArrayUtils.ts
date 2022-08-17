export class ArrayUtils {
	public static last<T>(array: T[] | readonly T[]): T | undefined {
		return array[array.length - 1];
	}
}
