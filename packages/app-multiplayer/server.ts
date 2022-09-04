import { createServer, Infer } from "@package/multiplayer";
import { platformCloudflare } from "@package/multiplayer-platform-cloudflare";
import { z } from "zod";
import type { MultiplayerClientInput } from "./client";

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

export type MultiplayerServerInput = Infer<typeof multiplayerServer>;
