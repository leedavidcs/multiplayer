import { createMultiplayer } from "@package/multiplayer-react";

const bundle = createMultiplayer(() => import("@package/app-multiplayer/client").then((mod) => mod.multiplayerClient));

export const MultiplayerProvider = bundle.MultiplayerProvider;
export const useBroadcast = bundle.useBroadcast;
export const useEvent = bundle.useEvent;
export const useMultiplayerClient = bundle.useMultiplayerClient;
