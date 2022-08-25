import type { Multiplayer } from "@package/multiplayer";
import { createRouter } from "@package/wrangler-utils";

export type DurableObjectClass<TEnv> =
	new(state: DurableObjectState, env: TEnv) => DurableObject;

export interface PlatformCloudflareWorkersConfig {
	apiEndpoint: string;
	multiplayer: Multiplayer;
}

export interface PlatformCloudflareWorkersResult<TEnv> {
	RoomDurableObject: DurableObjectClass<TEnv>;
}

export const platformCloudflareWorkers = <TEnv>(
	config: PlatformCloudflareWorkersConfig
): PlatformCloudflareWorkersResult<TEnv> => {
	const { multiplayer } = config;

	const router = createRouter<{ env: TEnv }>();


	class RoomDurableObject implements DurableObject {
		private _router = router;

		constructor(state: DurableObjectState, env: TEnv) {
			this._router.config({ context: { env  } });
		}

		public async fetch(request: Request): Promise<Response> {

		}
	}

	return { RoomDurableObject }
};
