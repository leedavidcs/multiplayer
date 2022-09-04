import { createClient, CreateMultiplayerClientOptions, Infer } from "@package/multiplayer-client";
import { z }from "zod";

export type getMultiplayerClient = CreateMultiplayerClientOptions;

export const getMultiplayerClient = (options: CreateMultiplayerClientOptions) => {
	return createClient(options)
		.event("RECEIVE_MESSAGE", {
			input: z.object({
				message: z.string()
			})
		});
}
export type MultiplayerClientInput = Infer<ReturnType<typeof getMultiplayerClient>>;
