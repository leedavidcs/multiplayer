export class UrlUtils {
	public static ensureHttp(url: string): string {
		return `http://${UrlUtils.stripProtocol(url)}`;
	}

	public static ensureHttps(url: string): string {
		return `https://${UrlUtils.stripProtocol(url)}`;
	}

	public static ensureWs(url: string): string {
		return `ws://${UrlUtils.stripProtocol(url)}`;
	}

	public static ensureWss(url: string): string {
		return `wss://${UrlUtils.stripProtocol(url)}`;
	}

	public static isValid(url: string): boolean {
		try {
			const _url = new URL(url);

			return _url.protocol === "http:" || _url.protocol === "https:";
		} catch {
			return false;
		}
	}

	public static preferHttps(url: string): string {
		return /^(https?|wss?):\/\/localhost/.test(url)
			? UrlUtils.ensureHttp(url)
			: UrlUtils.ensureHttps(url);
	}

	public static preferWss(url: string): string {
		return /^(https?|wss?):\/\/localhost/.test(url)
			? UrlUtils.ensureWs(url)
			: UrlUtils.ensureWss(url);
	}

	public static stripProtocol(url: string): string {
		return url.replace(/^(wss?|https?):\/\//, "");
	}
}
