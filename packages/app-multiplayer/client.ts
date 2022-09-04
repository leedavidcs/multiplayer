import { createClient, CreateMultiplayerClientOptions, Infer } from "@package/multiplayer-client";
import { z }from "zod";
import type { MultiplayerServerInput } from "./server";

export type getMultiplayerClient = CreateMultiplayerClientOptions;

export const _getMultiplayerClient = (options: CreateMultiplayerClientOptions) => {
	return createClient(options)
		.event("RECEIVE_MESSAGE", {
			input: z.object({
				message: z.string()
			})
		});
};

const _multiplayerClient = createClient()
	.event("RECEIVE_MESSAGE", {
		input: z.object({
			message: z.string()
		})
	});

export const multiplayerClient = _multiplayerClient
	.useBroadcastType<MultiplayerServerInput>();

export type MultiplayerClientInput = Infer<typeof _multiplayerClient>;
