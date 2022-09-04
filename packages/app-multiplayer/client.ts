import { createClient, Infer } from "@package/multiplayer-client";
import { z }from "zod";
import type { MultiplayerServerInput } from "./server";

const _multiplayerClient = createClient()
	.event("RECEIVE_MESSAGE", {
		input: z.object({
			message: z.string()
		})
	});

export const multiplayerClient = _multiplayerClient
	.useBroadcastType<MultiplayerServerInput>();

export type MultiplayerClientInput = Infer<typeof _multiplayerClient>;
