import { ms } from "@package/common-utils";
import { RateLimiter, RequestUtils } from "@package/wrangler-utils";

const MAX_REQUESTS = 250;
const DURATION = ms("1m");

export class RateLimiterDurableObject implements DurableObject {
	private _rateLimiter = new RateLimiter({
		duration: DURATION,
		maxRequests: MAX_REQUESTS
	});

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			return new Response(JSON.stringify(this._rateLimiter.checkLimit()));
		});
	}
}
