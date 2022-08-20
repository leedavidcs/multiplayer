export interface RateLimiterOptions {
	// Time window in ms
	duration: number;
	// Max number of requests within time window
	maxRequests: number;
}

export interface RateLimiterCheckLimitResult {
	// The max number of requests available in current time window
	limit: number;
	// The number of remaining requests in the current time window
	remaining: number;
	// A unix timestamp of when the rate limit will reset, in seconds
	reset: number;
	// `reset`, but expressed as ms
	resetMs: number;
}

export class RateLimiter {
	private _options: RateLimiterOptions;
	private _requestTimes: number[] = [];
	private _resetTime: number | null = null;

	constructor(options: RateLimiterOptions) {
		this._options = options;
	}

	public checkLimit(): RateLimiterCheckLimitResult {
		const resetMs = this._getResetTime();
		const reset = resetMs / 1_000;

		const windowStart = resetMs - this._options.duration;

		this._requestTimes = this._requestTimes.filter(
			(requestTime) => requestTime < windowStart
		);

		this._requestTimes.push(Date.now());

		const remaining: number = this._options.maxRequests - this._requestTimes.length
		const limit = this._options.maxRequests;

		return { limit, remaining, reset, resetMs };
	}

	public static getDefaultState(options: RateLimiterOptions) {
		const nowMs: number = Date.now();
		const resetMs: number = nowMs + options.duration;

		return {
			limit: options.maxRequests,
			remaining: options.maxRequests,
			reset: resetMs / 1_000,
			resetMs
		};
	}

	private _getResetTime(): number {
		const nowMs = Date.now();

		if (!this._resetTime || nowMs > this._resetTime) {
			this._resetTime = nowMs + this._options.duration;
		}

		return this._resetTime;
	}
}
