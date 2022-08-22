import { LangUtils, ms, UrlUtils } from "@package/common-utils";
import { produce } from "immer";

const HEARTBEAT_INTERVAL = ms("30s");
const PONG_TIMEOUT = ms("2s");
const ROOM_NAME_MAX_LENGTH = 32;
const ROOM_NAME_PATTERN = /^[0-9a-f]{64}$/;

interface WebSocketListeners {
	onClose: (event: CloseEvent) => void;
	onError: () => void;
	onMessage: (message: MessageEvent<string>) => void;
	onOpen: () => void;
}

interface IntervalIds {
	heartbeat: number | null;
}

interface TimeoutIds {
	pong: number | null;
}

export enum ConnectionState {
	Closed = "Closed",
	Connecting = "Connecting",
	Open = "Open",
	Unavailable = "Unavailable"
}

export interface WebSocketConnection {
	state: ConnectionState;
}

export interface WebSocketState {
	connection: WebSocketConnection;
	webSocket: WebSocket | null;
}

export interface WebSocketManagerConfig {
	apiEndpoint: string;
	debug?: boolean;
	onChange?: (state: WebSocketState) => void;
	onMessage?: (message: MessageEvent<string>) => void;
}


export class WebSocketManager {
	private _config: WebSocketManagerConfig;
	private _intervals: IntervalIds = {
		heartbeat: null
	};
	private _state: WebSocketState = {
		connection: {
			state: ConnectionState.Closed
		},
		webSocket: null
	};
	private _timeouts: TimeoutIds = {
		pong: null
	};
	private _wsListeners: WebSocketListeners | null = null;

	constructor(config: WebSocketManagerConfig) {
		this._config = config;
	}

	public get connection(): WebSocketConnection {
		// Create a read-only clone of the connection state
		return Object.freeze(JSON.parse(JSON.stringify(this._state.connection)));
	}

	public get webSocket(): WebSocket | null {
		return this._state.webSocket;
	}

	public async connect(): Promise<void> {
		const response = await fetch(
			`${UrlUtils.preferHttps(this._config.apiEndpoint)}/api/room`
		);

		if (!response.ok) {
			throw new Error("Could not connect to Multiplayer room.");
		}

		const roomName = await response.text();
		const normalizedName = this._normalizeRoomName(roomName);

		const webSocket = new WebSocket(
			`${UrlUtils.preferWss(this._config.apiEndpoint)}/api/room/${normalizedName}`
		);

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Connecting;
			oldState.webSocket = webSocket;

			return oldState;
		});

		this._attachWsListeners();
	}

	public disconnect(): void {
		if (!this._state.webSocket) return;

		this._closeWs();

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Closed;
			oldState.webSocket = null;

			return oldState;
		});
	}

	public async reconnect(): Promise<void> {
		if (!this._state.webSocket)return;

		this._closeWs();

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Unavailable;
			oldState.webSocket = null;

			return oldState;
		});

		await this.connect();
	}

	private _attachWsListeners(): void {
		if (!this._state.webSocket) return;

		this._wsListeners = {
			onClose: this._onClose.bind(this),
			onError: this._onError.bind(this),
			onMessage: this._onMessage.bind(this),
			onOpen: this._onOpen.bind(this)
		};

		this._state.webSocket.addEventListener("close", this._wsListeners.onClose);
		this._state.webSocket.addEventListener("error", this._wsListeners.onError);
		this._state.webSocket.addEventListener("message", this._wsListeners.onMessage);
		this._state.webSocket.addEventListener("open", this._wsListeners.onOpen);
	}

	private _closeWs(): void {
		if (!this._state.webSocket) return;

		this._detachWsListeners();

		clearInterval(this._intervals.heartbeat ?? undefined);
		clearTimeout(this._timeouts.pong ?? undefined);

		this._state.webSocket.close();
	}

	private _detachWsListeners(): void {
		if (!this._state.webSocket || !this._wsListeners) return;

		this._state.webSocket.removeEventListener("close", this._wsListeners.onClose);
		this._state.webSocket.removeEventListener("error", this._wsListeners.onError);
		this._state.webSocket.removeEventListener("message", this._wsListeners.onMessage);
		this._state.webSocket.removeEventListener("open", this._wsListeners.onOpen);

		this._wsListeners = null;
	}

	private _heartbeat(): void {
		if (!this._state.webSocket) return;
		if (this._state.webSocket.readyState !== this._state.webSocket.OPEN) return;

		clearTimeout(this._timeouts.pong ?? undefined);
		this._timeouts.pong = setTimeout(this.reconnect.bind(this), PONG_TIMEOUT);

		/**
		 * TODO
		 * @description Create a helper to use server event message types, and handles
		 * input validation, parsing and errors
		 * @author David Lee
		 * @date August 20, 2022
		 */
		this._state.webSocket.send(JSON.stringify({ type: "$PING", data: {} }));
	}

	private _normalizeRoomName(roomName: string): string {
		const normalized = roomName
		.replace(/[^a-zA-Z0-9_-]/g, "")
		.replace(/_/g, "-")
		.toLowerCase();
	
		if (normalized.length > ROOM_NAME_MAX_LENGTH && !ROOM_NAME_PATTERN.test(roomName)) {
			throw new Error("Invalid Multiplayer room name");
		}
	
		return normalized;
	}

	/**
	 * TODO
	 * @description Determine if ws was closed with a code for closing without retries.
	 * Otherwise, attempt to retry again with incremental backoff
	 * @author David Lee
	 * @date August 19, 2022
	 */
	private _onClose(event: CloseEvent): void {
		if (this._config.debug) console.log(event.reason);

		clearInterval(this._intervals.heartbeat ?? undefined);
		clearTimeout(this._timeouts.pong ?? undefined);

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Closed;
			oldState.webSocket = null;
		
			return oldState;
		});
	}

	/**
	 * TODO
	 * @description Handle websocket errors in a meaningful way, should they occur
	 * @author David Lee
	 * @date August 19, 2022
	 */
	private _onError(): void {}

	private _onMessage(message: MessageEvent<string>): void {
		this._config.onMessage?.(message);
	}

	private _onOpen(): void {
		if (this._state.connection.state !== ConnectionState.Connecting) return;

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Open;
		
			return oldState;
		});

		clearInterval(this._intervals.heartbeat ?? undefined);
		this._intervals.heartbeat = setInterval(this._heartbeat.bind(this), HEARTBEAT_INTERVAL);
	}

	private _updateState(updater: (oldState: WebSocketState) => void): WebSocketState {
		const newState = produce(this._state, updater);

		this._state = newState;

		this._config.onChange?.(newState);

		return newState;
	}
}
