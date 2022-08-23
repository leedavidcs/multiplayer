import { ms } from "@package/common-utils";
import { createMultiplayer } from "@package/multiplayer";
import {
	createRouter,
	RateLimiterClient,
	RequestUtils,
	WebSocketUtils
} from "@package/wrangler-utils";

interface Context {
	env: Env;
	storage: DurableObjectStorage;
}

const multiplayer = createMultiplayer<Context, {}>();

const router = createRouter<Env>()
	.path("/websocket", (__, { env, request }) => {
		if (!RequestUtils.isWebSocketRequest(request)) {
			return new Response("Expected websocket", { status: 400 });
		}

		const [client, server] = WebSocketUtils.makeWebSocketPair();

		const requestIp: string = RequestUtils.getRequestIp(request);
		const limiterId = env.limiters.idFromName(requestIp);
		const limiter = new RateLimiterClient({
			duration: ms("1m"),
			getLimiterStub: () => env.limiters.get(limiterId),
			maxRequests: 1_000
		})

		multiplayer.register(server, {
			middleware: () => {
				const limit = limiter.checkLimit();

				if (limit.remaining > 0) return;

				throw new Error(
					"Your IP is being rate-limited. Please try again later."
				);
			}
		});

		return new Response(null, { status: 101, webSocket: client });
	});

export class RoomDurableObject implements DurableObject {
	private _multiplayer = multiplayer;
	private _router = router;

	constructor(state: DurableObjectState, env: Env) {
		this._multiplayer.config({
			context: {
				env,
				storage: state.storage
			}
		});

		this._router.config({ env });
	}

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			return await this._router.match(request);
		});
	}
}
