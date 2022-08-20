export class ObjectUtils {
	public static safeAssign<
		T1 extends Record<string, any>,
		T2 extends Record<string, any>
	>(obj1: T1, obj2: T2): Spread<[T1, T2]> {
		return Object.assign(Object.create(null), obj1, obj2);
	}
}
