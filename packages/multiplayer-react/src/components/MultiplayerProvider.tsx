import { MultiplayerClient } from "@package/multiplayer-client";
import { useLoadClient } from "internal";
import { createContext, FC, ReactNode } from "react";

export interface MultiplayerProviderContextValue {
	client: MultiplayerClient | null;
}

const MultiplayerProviderContext = createContext<MultiplayerProviderContextValue>({
	client: null
});

export interface MultiplayerProviderProps {
	children?: ReactNode;
	client: MultiplayerClient | (() => MaybePromise<MultiplayerClient>)
}

export const MultiplayerProvider: FC<MultiplayerProviderProps> = ({
	children,
	client: loader
}) => {
	const client = useLoadClient(loader);

	return (
		<MultiplayerProviderContext.Provider value={{ client }}>
			{children}
		</MultiplayerProviderContext.Provider>
	);
};

MultiplayerProvider.displayName = "MultiplayerProvider";
