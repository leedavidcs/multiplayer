import { InferEventMessage, InferInput, InferOutput, MultiplayerClient } from "@package/multiplayer-client";
import { FC, ReactNode, useCallback, useContext, useEffect } from "react";
import { MultiplayerContext } from "./context";
import { useLoadClient } from "./internal";

export interface MultiplayerProviderProps {
	children?: ReactNode;
}

export type LoadClient<
	TMultiplayer extends MultiplayerClient
> = TMultiplayer | (() => MaybePromise<TMultiplayer>);

export type UseMultiplayerClient<TMultiplayer extends MultiplayerClient> =
	| { client: TMultiplayer; loading: false }
	| { client: null; loading: true };

export interface CreateMultiplayerResult<TMultiplayer extends MultiplayerClient<any, any>> {
	// components
	MultiplayerProvider: FC<MultiplayerProviderProps>;

	// hooks
	useBroadcast: <
		TMessage extends InferEventMessage<InferOutput<TMultiplayer>>
	>() => ((message: TMessage) => void)
	useEvent: <TType extends keyof InferInput<TMultiplayer>>(
		type: TType,
		callback: (data: InferInput<TMultiplayer>[TType]) => void
	) => void;
	useMultiplayerClient: () => UseMultiplayerClient<TMultiplayer>;
}

export const createMultiplayer = <TMultiplayer extends MultiplayerClient<any, any>>(
	multiplayer: LoadClient<TMultiplayer>
): CreateMultiplayerResult<TMultiplayer> => {
	const MultiplayerProvider: FC<MultiplayerProviderProps> = ({ children }) => {
		const client = useLoadClient(multiplayer);

		return (
			<MultiplayerContext.Provider value={{ client }}>
				{children}
			</MultiplayerContext.Provider>
		);
	};

	const useMultiplayerClient = (): UseMultiplayerClient<TMultiplayer> => {
		const { client } = useContext(MultiplayerContext);

		return !client
			? { loading: true, client: null }
			: { loading: false, client: client as TMultiplayer };
	};

	const useBroadcast = <
		TMessage extends InferEventMessage<InferOutput<TMultiplayer>>
	>(): ((message: TMessage) => void) => {
		const { client, loading } = useMultiplayerClient();

		return useCallback((message: TMessage) => {
			if (loading) {
				throw new Error("Client is still loading. Message could not be sent.");
			}

			client.broadcast(message);
		}, [client, loading]);
	};

	const useEvent = <TType extends keyof InferInput<TMultiplayer>>(
		type: TType,
		callback: (data: InferInput<TMultiplayer>[TType]) => void
	): void => {
		const { client, loading } = useMultiplayerClient();

		useEffect(() => {
			if (loading) return;

			client.addEventListener(type, callback);

			return () => {
				client.removeEventListener(type, callback);
			};
		}, [client, loading]);
	};

	return {
		// components
		MultiplayerProvider,

		// hooks
		useBroadcast,
		useEvent,
		useMultiplayerClient
	};
};
