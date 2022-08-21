import { UrlUtils } from "@package/common-utils";
import { EventMessage } from "@package/multiplayer-internal";
import { produce } from "immer";
import { ConnectionState, State } from "./getDefaultState";

const ROOM_NAME_MAX_LENGTH = 32;
const ROOM_NAME_PATTERN = /^[0-9a-f]{64}$/;

export interface MakeStateMachineOptions {
	apiEndpoint: string;
	debug?: boolean;
	onChange?: (state: State) => void;
	onMessage?: (data: EventMessage<string, any>) => void;
	parseMessage?: (message: MessageEvent<string>) => EventMessage<string, any> | null;
}

export interface StateMachine {
	connect: () => Promise<void>;
	disconnect: () => void;
	reconnect: () => Promise<void>;
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
): StateMachine => {
	const _options: NonNilProps<MakeStateMachineOptions> = {
		debug: false,
		onChange: () => undefined,
		onMessage: () => undefined,
		parseMessage: (message) => JSON.parse(message.data),
		...options
	};
	let _state: State = initialState;

	function _updateState(updater: (oldState: State) => State): State {
		_state = produce(_state, updater);

		_options.onChange(_state);

		return _state;
	}
	
	/**
	 * TODO
	 * @description Determine if websocket was closed with a code for closing without retries or
	 * otherwise, attempt to retry again with incremental backoff
	 * @author David Lee
	 * @date August 19, 2022
	 */
	function _onClose(event: CloseEvent): void {
		if (_options.debug) console.log(event.reason);

		_updateState((oldState) => {
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
	function _onError() {}

	function _onMessage(message: MessageEvent<string>): void {
		const data = _options.parseMessage(message);

		!!data && _options.onMessage(data);
	}

	function _onOpen(): void {
		if (_state.connection.state !== ConnectionState.Connecting) return;

		_updateState((oldState) => {
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

		webSocket.addEventListener("close", _onClose);
		webSocket.addEventListener("error", _onError);
		webSocket.addEventListener("message", _onMessage);
		webSocket.addEventListener("open", _onOpen);

		_updateState((oldState) => {
			oldState.webSocket = webSocket;
			oldState.connection.state = ConnectionState.Connecting;

			return oldState;
		});
	}

	function _closeWebSocket(): void {
		if (!_state.webSocket) return;

		_state.webSocket.removeEventListener("close", _onClose);
		_state.webSocket.removeEventListener("error", _onError);
		_state.webSocket.removeEventListener("message", _onMessage);
		_state.webSocket.removeEventListener("open", _onOpen);

		_state.webSocket.close();
	}

	function disconnect(): void {
		_closeWebSocket();

		_updateState((oldState) => {
			oldState.webSocket = null;
			oldState.connection.state = ConnectionState.Closed;

			return oldState;
		});
	}

	async function reconnect(): Promise<void> {
		_closeWebSocket();

		_updateState((oldState) => {
			oldState.webSocket = null;
			oldState.connection.state = ConnectionState.Unavailable;

			return oldState;
		});

		await connect();
	}

	return {
		connect,
		disconnect,
		reconnect
	};
};
