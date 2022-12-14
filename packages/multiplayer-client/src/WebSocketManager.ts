import { ms } from "@package/common-utils";
import { EventMessage, EventRecord, InferEventMessage } from "@package/multiplayer-internal";
import { produce } from "immer";

const HEARTBEAT_INTERVAL = ms("30s");
const PONG_TIMEOUT = ms("2s");

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

export interface WebSocketManagerConfigOptions {
	apiEndpoint: string | (() => MaybePromise<string>);
	debug?: boolean;
}

interface InternalConfig {
	apiEndpoint?: string | (() => MaybePromise<string>);
	debug?: boolean;
}

interface InternalListeners {
	onMessage?: (message: MessageEvent<string>) => void;
	onUpdate?: (state: WebSocketState) => void;
}

export interface WebSocketManagerOptions {
	apiEndpoint?: string | (() => MaybePromise<string>);
	debug?: boolean;
	onMessage?: (message: MessageEvent<string>) => void;
	onUpdate?: (state: WebSocketState) => void;
}


export class WebSocketManager<
	TOutput extends EventRecord<string, any> = {}
> {
	readonly _config: InternalConfig;

	private _intervals: IntervalIds = {
		heartbeat: null
	};
	private _listeners: InternalListeners;
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

	constructor(options: WebSocketManagerOptions) {
		this._config = {
			apiEndpoint: options.apiEndpoint,
			debug: options.debug,
		};

		this._listeners = {
			onMessage: options.onMessage,
			onUpdate: options.onUpdate
		};
	}

	public get connection(): WebSocketConnection {
		// Create a read-only clone of the connection state
		return Object.freeze(JSON.parse(JSON.stringify(this._state.connection)));
	}

	public get webSocket(): WebSocket | null {
		return this._state.webSocket;
	}

	public broadcast(message: InferEventMessage<TOutput>): void {
		if (!this._state.webSocket) return;
		if (this._state.connection.state !== ConnectionState.Open) return;

		this._sendMessage(this._state.webSocket, message);
	}

	public async connect(): Promise<void> {
		if (!this._config.apiEndpoint) {
			throw new Error("Must provide an apiEndpoint.");
		}

		// Consider memoizing apiEndpoint as a private property, to avoid recomputing
		// this, and what kind of impact memoizing would have on things such as auth
		const apiEndpoint = typeof this._config.apiEndpoint === "string"
			? this._config.apiEndpoint
			: await Promise.resolve(this._config.apiEndpoint());

		const webSocket = new WebSocket(apiEndpoint);

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Connecting;
			oldState.webSocket = webSocket;

			return oldState;
		});

		this._attachWsListeners();
	}

	public disconnect(): void {
		if (!this._config.apiEndpoint) {
			throw new Error("Must provide an apiEndpoint.");
		}

		if (!this._state.webSocket) return;

		this._closeWs();

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Closed;
			oldState.webSocket = null;

			return oldState;
		});
	}

	public async reconnect(): Promise<void> {
		if (!this._config.apiEndpoint) {
			throw new Error("Must provide an apiEndpoint.");
		}

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

		this._sendMessage(this._state.webSocket, {
			type: "$PING",
			data: {}
		});
	}

	private _logDebug(...data: any[]): void {
		this._config.debug && console.log(...data);
	}

	/**
	 * TODO
	 * @description Determine if ws was closed with a code for closing without retries.
	 * Otherwise, attempt to retry again with incremental backoff
	 * @author David Lee
	 * @date August 19, 2022
	 */
	private _onClose(event: CloseEvent): void {
		this._logDebug("WebSocket closed");
		!!event.reason && this._logDebug(event.reason);

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
		this._listeners.onMessage?.(message);
	}

	private _onOpen(): void {
		if (this._state.connection.state !== ConnectionState.Connecting) return;

		this._logDebug("WebSocket connected");

		this._updateState((oldState) => {
			oldState.connection.state = ConnectionState.Open;
		
			return oldState;
		});

		clearInterval(this._intervals.heartbeat ?? undefined);
		this._intervals.heartbeat = setInterval(this._heartbeat.bind(this), HEARTBEAT_INTERVAL);
	}

	private _sendMessage<
		TMessage extends EventMessage<string, any> = EventMessage<string, any>
	>(webSocket: WebSocket, data: TMessage): void {
		this._logDebug("WebSocket event sent: ", data.type, data);

		webSocket.send(JSON.stringify(data));
	}

	private _updateState(updater: (oldState: WebSocketState) => void): WebSocketState {
		const newState = produce(this._state, updater);

		this._logDebug("WebSocket new state: ", newState);

		this._state = newState;

		this._listeners.onUpdate?.(newState);

		return newState;
	}
}
