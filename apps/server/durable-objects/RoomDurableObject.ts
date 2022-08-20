import { createRouter, RequestUtils, WebSocketUtils } from "@package/wrangler-utils";
import { createMultiplayer } from "@package/multiplayer";

const multiplayer = createMultiplayer<Env, {}>();

const router = createRouter<Env>()
	.path("/websocket", (__, { env, request }) => {
		if (!RequestUtils.isWebSocketRequest(request)) {
			return new Response("Expected websocket", { status: 400 });
		}

		const [client, server] = WebSocketUtils.makeWebSocketPair();

		const requestIp: string = RequestUtils.getRequestIp(request);
		const limiterId = env.limiters.idFromName(requestIp);

		/**
		 * TODO
		 * @description Connect limiter to multiplayer message event
		 * @author David Lee
		 * @date August 18, 2022
		 */

		multiplayer.register(server);

		return new Response(null, { status: 101, webSocket: client });
	});

export class RoomDurableObject implements DurableObject {
	private _multiplayer = multiplayer;
	private _router = router;

	constructor(state: DurableObjectState, env: Env) {
		this._multiplayer.config({
			env,
			storage: state.storage
		});

		this._router.config({ env });
	}

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			return await this._router.match(request);
		});
	}
}
