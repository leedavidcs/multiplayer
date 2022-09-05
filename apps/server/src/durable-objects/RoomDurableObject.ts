import { multiplayerServer } from "@package/app-multiplayer/server";
import { ms } from "@package/common-utils";
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

const router = createRouter<Context>()
	.path("post", "/websocket", (__, { context: { env }, request }) => {
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
		});

		multiplayerServer.register(server, {
			middleware: ({ session }, next) => {
				const [limit, error] = limiter.checkLimit();

				if (error) {
					session.webSocket.close(1011, error.stack);

					return;
				}

				if (limit.remaining <= 0) {
					throw new Error(
						"Your IP is being rate-limited. Please try again later."
					);
				};

				next();
			}
		});

		return new Response(null, { status: 101, webSocket: client });
	});

export class RoomDurableObject implements DurableObject {
	private _multiplayer = multiplayerServer;
	private _router = router;

	constructor(state: DurableObjectState, env: Env) {
		const context: Context = {
			env,
			storage: state.storage
		};

		this._multiplayer.setConfig({ context });
		this._router.setConfig({ context });
	}

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			return await this._router.match(request);
		});
	}
}
