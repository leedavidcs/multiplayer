import { createClient, InferInput } from "@package/multiplayer-client";
import { z }from "zod";
import type { MultiplayerServerInput } from "./server";

export * from "@package/multiplayer-client";

const _multiplayerClient = createClient()
	.event("RECEIVE_MESSAGE", {
		input: z.object({
			message: z.string()
		})
	});

export const multiplayerClient = _multiplayerClient
	.useBroadcastType<MultiplayerServerInput>();

export type MultiplayerClientInput = InferInput<typeof _multiplayerClient>;

export default multiplayerClient
