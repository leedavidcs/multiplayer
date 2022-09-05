import { multiplayerClient } from "@package/app-multiplayer/client";
import { createMultiplayer } from "@package/multiplayer-react";

const bundle = createMultiplayer(multiplayerClient);

export const MultiplayerProvider = bundle.MultiplayerProvider;
export const useBroadcast = bundle.useBroadcast;
export const useEvent = bundle.useEvent;
export const useMultiplayerClient = bundle.useMultiplayerClient;
