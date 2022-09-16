import { createServer, InferInput } from "@package/multiplayer-server";
import { platformCloudflare } from "@package/multiplayer-platform-cloudflare";
import { z } from "zod";
import type { MultiplayerClientInput } from "./client";

export * from "@package/multiplayer-server";

export const multiplayerServer = createServer<{}, MultiplayerClientInput>()
	.usePlatform(platformCloudflare())
	.event("SEND_MESSAGE", {
		input: z.object({
			message: z.string()
		}),
		resolver: ({ message }, { broadcast }) => {
			broadcast({
				type: "RECEIVE_MESSAGE",
				data: { message }
			})
		}
	});

export type MultiplayerServerInput = InferInput<typeof multiplayerServer>;
