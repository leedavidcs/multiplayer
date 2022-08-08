import { RequestUtils } from "@package/wrangler-utils";

export class RoomDurableObject implements DurableObject {
	private env: Env;
	private storage: DurableObjectStorage;

	constructor(state: DurableObjectState, env: Env) {
		this.env = env;
		this.storage = state.storage;
	}

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			
		});
	}
}
