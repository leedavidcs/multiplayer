import {
	InferEventMessage,
	InferInput,
	InferOutput,
	MultiplayerClient,
	MultiplayerClientConfigOptions,
	TypedEvent
} from "@package/multiplayer-client";
import { FC, ReactNode, useCallback, useContext, useEffect } from "react";
import { MultiplayerContext } from "./context";
import { useLoadClient, useRerender } from "./internal";

export interface MultiplayerProviderProps extends MultiplayerClientConfigOptions {
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
	const MultiplayerProvider: FC<MultiplayerProviderProps> = (props) => {
		const { children, onConnectionUpdate, ...options } = props;

		const rerender = useRerender();

		const client = useLoadClient(multiplayer, {
			onConnectionUpdate: (state) => {
				rerender();

				onConnectionUpdate?.(state);
			},
			...options
		});

		/**
		 * TODO
		 * @description Add loading state to useLoadClient. Return values for client.connection
		 * and client.webSocket in context.
		 * @author David Lee
		 * @date September 7, 2022
		 */

		useEffect(() => {
			if (!client) return;

			client.connect();

			return () => {
				client.disconnect();
			};
		}, [client]);

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
		callback: (
			data: InferInput<TMultiplayer>[TType],
			event: TypedEvent<InferInput<TMultiplayer>[TType]>
		) => void
	): void => {
		const { client, loading } = useMultiplayerClient();

		useEffect(() => {
			if (loading) return;

			const listener = (event: TypedEvent<InferInput<TMultiplayer>[TType]>) => {
				callback(event.data, event);
			};

			client.addEventListener(type, listener);

			return () => {
				client.removeEventListener(type, listener);
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
