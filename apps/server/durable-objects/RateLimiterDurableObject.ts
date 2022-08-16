import { RequestUtils } from "@package/wrangler-utils";

export class RateLimiterDurableObject implements DurableObject {
	private requestTimes: number[] = [];

	async fetch(request: Request): Promise<Response> {
		return await RequestUtils.handleErrors(request, async () => {
			const now = Date.now();

			this.requestTimes.push(now);
		});
	}
}
