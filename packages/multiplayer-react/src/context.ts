import { MultiplayerClient } from "@package/multiplayer-client";
import { createContext } from "react";

export interface MultiplayerContextValue {
	client: MultiplayerClient | null;
}

export const MultiplayerContext = createContext<MultiplayerContextValue>({
	client: null
});
