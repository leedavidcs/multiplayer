import { MultiplayerClient } from "@package/multiplayer-client";

export type LoadClient<
	TMultiplayer extends MultiplayerClient
> = TMultiplayer | (() => MaybePromise<TMultiplayer>);

export const createMultiplayer = <TMultiplayer extends MultiplayerClient>(
	multiplayer: LoadClient<TMultiplayer>
) => {
	
};
