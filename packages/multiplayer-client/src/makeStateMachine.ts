import { UrlUtils } from "@package/common-utils";
import { produce } from "immer";
import { Connection, ConnectionState, State } from "./getDefaultState";

const ROOM_NAME_MAX_LENGTH = 32;
const ROOM_NAME_PATTERN = /^[0-9a-f]{64}$/;

export interface MakeStateMachineOptions {
	apiEndpoint: string;
	debug?: boolean;
	onChange?: (state: State) => void;
	parseMessage?: (message: MessageEvent<string>) => void;
}

export interface StateMachine {
	connect: () => Promise<void>;
	disconnect: () => void | null;
	reconnect: () => void | null;
}

const normalizeRoomName = (roomName: string): string => {
	const normalized = roomName
	.replace(/[^a-zA-Z0-9_-]/g, "")
	.replace(/_/g, "-")
	.toLowerCase();

	if (normalized.length > ROOM_NAME_MAX_LENGTH && !ROOM_NAME_PATTERN.test(roomName)) {
		throw new Error("Invalid Multiplayer room name");
	}

	return normalized;
};

export const makeStateMachine = (
	initialState: State,
	options: MakeStateMachineOptions
) => {
	const _options: MakeStateMachineOptions = {
		parseMessage: (message) => JSON.parse(message.data),
		...options
	};
	let _state: State = initialState;

	function updateState(updater: (oldState: State) => State): State {
		_state = produce(_state, updater);

		_options.onChange?.(_state);

		return _state;
	}
	
	/**
	 * TODO
	 * @description Determine if websocket was closed with a code for closing without retries or
	 * otherwise, attempt to retry again with incremental backoff
	 * @author David Lee
	 * @date August 19, 2022
	 */
	function onClose(event: CloseEvent): void {
		if (_options.debug) console.log(event.reason);

		updateState((oldState) => {
			oldState.connection.state = ConnectionState.Closed;
			oldState.webSocket = null;

			return oldState;
		})
	}

	/**
	 * TODO
	 * @description Handle websocket errors in a meaningful way, should they occur
	 * @author David Lee
	 * @date August 19, 2022
	 */
	function onError() {}

	function onMessage(event: MessageEvent<string>) {
		
	}

	function onOpen(): void {
		if (_state.connection.state !== ConnectionState.Connecting) return;

		updateState((oldState) => {
			oldState.connection.state = ConnectionState.Open;

			return oldState;
		});
	}

	async function connect(): Promise<void> {
		const response = await fetch(
			`${UrlUtils.preferHttps(options.apiEndpoint)}/api/room`
		);

		if (!response.ok) {
			throw new Error("Could not connect to Multiplayer room.");
		}

		const roomName = await response.text();
		const normalizedName = normalizeRoomName(roomName);

		const webSocket = new WebSocket(
			`${UrlUtils.preferWss(_options.apiEndpoint)}/api/room/${normalizedName}`
		);

		webSocket.addEventListener("close", onClose);
		webSocket.addEventListener("error", onError);
		webSocket.addEventListener("open", onOpen);

		updateState((oldState) => {
			oldState.webSocket = webSocket;
			oldState.connection.state = ConnectionState.Connecting;

			return oldState;
		});
	}

	async function disconnect(): Promise<void> {

	}

	return {
		connect
	};
};
