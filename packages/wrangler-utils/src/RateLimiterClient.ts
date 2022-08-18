import { RateLimiter, RateLimiterCheckLimitResult } from "RateLimiter";

export interface RateLimiterClientConfig {
	duration: number;
	/**
	 * @description Returns a new Durable Object stub for the RateLimiter
	 * durable object that manages the limit. This may be called multiple
	 * times as needed to reconnect, if the connection is lost.
	 */
	getLimiterStub: () => DurableObjectStub;
	maxRequests: number;
	/**
	 * @description This is called when something goes wrong and the rate
	 * limiter is broken. It should probably disconnect the client, so that
	 * they can reconnect and start over.
	 */
	reportError?: (error: Error) => void;
}

export class RateLimiterClient {
	private _config: RateLimiterClientConfig;
	private _limiter: DurableObjectStub;
	private _state: RateLimiterCheckLimitResult | null = null;

	constructor(config: RateLimiterClientConfig) {
		this._config = config;

		// Get the initial RateLimiter durable object stub
		this._limiter = this._config.getLimiterStub();
	}

	public checkLimit(): RateLimiterCheckLimitResult {
		if (this._state) return this._state;

		this.callLimiter();

		return RateLimiter.getDefaultState({
			duration: this._config.duration,
			maxRequests: this._config.maxRequests
		});
	}

	private async callLimiter(): Promise<void> {
		try {
			let response: RateLimiterCheckLimitResult;

			try {
				response = await this._limiter
					.fetch("https://dummy-url", { method: "post" })
					.then((res) => res.json());
			} catch {
				/**
				 * !HACK
				 * @description `fetch()` threw an exception. This is probably because the limiter
				 * disconnected. Stubs implement E-order semantics, meaning that calls to the same
				 * stub are delivered to the remote object in-order, until the stub becomes
				 * disconnected, after which point all further calls fail. This guarantee makes a
				 * lot of complex interaction patterns easier, but it means we must be prepared for
				 * the occasional disconnect, as networks are inherently unreliable.
				 * @author David Lee
				 * @date August 18, 2022
				 */
				this._limiter = this._config.getLimiterStub();

				response = await this._limiter
					.fetch("https://dummy-url", { method: "post" })
					.then((res) => res.json());
			}

			this._state = response;
		} catch (error) {
			if (error instanceof Error) {
				this._config.reportError?.(error);
				
				return;
			}
			
			this._config.reportError?.(new Error("Unexpected rate limiter error"));
		}
	}
}
