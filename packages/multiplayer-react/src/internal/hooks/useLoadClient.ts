import { MultiplayerClient } from "@package/multiplayer-client";
import { useEffect, useState } from "react";

export type LoadClient = MultiplayerClient | (() => MaybePromise<MultiplayerClient>);

export const useLoadClient = (loader: LoadClient): MultiplayerClient | null => {
	const [client, setClient] = useState<MultiplayerClient | null>(
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
