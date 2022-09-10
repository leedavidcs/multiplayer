export class CustomEvent<T = unknown> extends Event {
	readonly detail: T;

	constructor(type: string, data: { detail: T }) {
		super(type);

		this.detail = data.detail;
	}
}

export class TypedEvent<T = unknown> extends CustomEvent<T> {
	constructor(type: string, data: T) {
		super(type, { detail: data });
	}

	public get data(): T {
		return this.detail;
	}
}
