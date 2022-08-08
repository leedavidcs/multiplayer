import { RequestUtils, router, WebSocketUtils } from "@package/wrangler-utils";

export class RoomDurableObject implements DurableObject {
	private env: Env;
	private storage: DurableObjectStorage;

	private router = router()
		.path("/websocket", (__, request) => {
			if (!RequestUtils.isWebSocketRequest(request)) {
				return new Response("Expected websocket", { status: 400 });
			}

			const ip = RequestUtils.getRequestIp(request);
			const [client, server] = WebSocketUtils.makeWebSocketPair();

			return new Response(null, { status: 101, webSocket: client });
		});

	constructor(state: DurableObjectState, env: Env) {
		this.env = env;
		this.storage = state.storage;
	}

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			return this.router.match(request);
		});
	}
}
