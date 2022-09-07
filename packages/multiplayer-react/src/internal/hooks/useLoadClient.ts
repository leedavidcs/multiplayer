import { MultiplayerClient, MultiplayerClientConfigOptions } from "@package/multiplayer-client";
import { useEffect, useState } from "react";

export type LoadClient<
	TMultiplayer extends MultiplayerClient
> = TMultiplayer | (() => MaybePromise<TMultiplayer>);

export const useLoadClient = <
	TMultiplayer extends MultiplayerClient
>(
	loader: LoadClient<TMultiplayer>,
	options: MultiplayerClientConfigOptions
): TMultiplayer | null => {
	const [client, setClient] = useState<TMultiplayer | null>(
		loader instanceof MultiplayerClient
			? loader.setConfig(options) as TMultiplayer
			: null
	);

	if (!loader) {
		throw new Error("MultiplayerProvider client is not defined.");
	}

	useEffect(() => {
		if (!!client) return;

		// Should not reach here, but handling anyways
		if (loader instanceof MultiplayerClient) {
			setClient(loader.setConfig(options) as TMultiplayer);

			return;
		}

		Promise.resolve(loader()).then((newClient) => {
			setClient(newClient.setConfig(options) as TMultiplayer);
		});
	}, [loader, !client]);

	return client;
};
