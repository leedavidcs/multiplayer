import { MultiplayerClient } from "@package/multiplayer-client";
import { useEffect, useState } from "react";

export type LoadClient<
	TMultiplayer extends MultiplayerClient
> = TMultiplayer | (() => MaybePromise<TMultiplayer>);

export const useLoadClient = <
	TMultiplayer extends MultiplayerClient
>(loader: LoadClient<TMultiplayer>): TMultiplayer | null => {
	const [client, setClient] = useState<TMultiplayer | null>(
		loader instanceof MultiplayerClient ? loader : null
	);

	if (!loader) {
		throw new Error("MultiplayerProvider client is not defined.");
	}

	useEffect(() => {
		if (!!client) return;

		// Should not reach here, but handling anyways
		if (loader instanceof MultiplayerClient) {
			setClient(loader);

			return;
		}

		Promise.resolve(loader()).then((newClient) => setClient(newClient));
	}, [loader, !client]);

	return client;
};
