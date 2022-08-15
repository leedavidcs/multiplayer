import { createRouter, RequestUtils, WebSocketUtils } from "@package/wrangler-utils";
import { createMultiplayer } from "@package/multiplayer";
export class RoomDurableObject implements DurableObject {
	private env: Env;
	private multiplayer = createMultiplayer<Env, {}>();
	private router = createRouter<Env>()
		.path("/websocket", (__, request) => {
			if (!RequestUtils.isWebSocketRequest(request)) {
				return new Response("Expected websocket", { status: 400 });
			}

			const [client, server] = WebSocketUtils.makeWebSocketPair();

			this.multiplayer.register(server);

			return new Response(null, { status: 101, webSocket: client });
		});

	constructor(state: DurableObjectState, env: Env) {
		this.env = env;

		this.multiplayer.config({
			env,
			storage: state.storage
		});
	}

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			return await this.router.match(request, this.env);
		});
	}
}
