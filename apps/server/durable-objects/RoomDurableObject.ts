import { createRouter, RequestUtils, WebSocketUtils } from "@package/wrangler-utils";
import { createMultiplayer } from "@package/multiplayer";

export class RoomDurableObject implements DurableObject {
	private env: Env;
	private multiplayer = createMultiplayer<Env, {}>();
	private router = createRouter<Env>()
		.path("/websocket", (__, { request }) => {
			if (!RequestUtils.isWebSocketRequest(request)) {
				return new Response("Expected websocket", { status: 400 });
			}

			const [client, server] = WebSocketUtils.makeWebSocketPair();

			const requestIp: string = RequestUtils.getRequestIp(request);
			const limiterId = this.env.limiters.idFromName(requestIp);

			/**
			 * TODO
			 * @description Connect limiter to multiplayer message event
			 * @author David Lee
			 * @date August 18, 2022
			 */

			this.multiplayer.register(server);

			return new Response(null, { status: 101, webSocket: client });
		});

	constructor(state: DurableObjectState, env: Env) {
		this.env = env;

		this.multiplayer.config({
			env,
			storage: state.storage
		});

		this.router.config({ env });
	}

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			return await this.router.match(request);
		});
	}
}
