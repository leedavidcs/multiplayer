import { MultiplayerProvider } from "../components";
import { NextComponentType } from "next";
import NextHead from "next/head";
import { AppContext, AppInitialProps, AppProps } from "next/app";

export const App: NextComponentType<AppContext, AppInitialProps, AppProps> = ({
	Component,
	pageProps
}) => {
	return (
		<>
			<NextHead>
				<></>
			</NextHead>
			{/**
			 * TODO
			 * @description Handle api-endpoint room selection eventually
			 * @author David Lee
			 * @date September 7, 2022
			 */}
			<MultiplayerProvider
				apiEndpoint={async () => {
					const response = await fetch("http://localhost:8787/api/room", {
						method: "post"
					});

					if (!response.ok) {
						alert("Something went wrong");

						document.location.reload();

						return;
					}

					const roomName = await response.text();

					const normalized = roomName
						.replace(/[^a-zA-Z0-9_-]/g, "")
						.replace(/_/g, "-")
						.toLowerCase();

					return `ws://localhost:8787/api/room/${normalized}/websocket`;
				}}
				debug
			>
				<Component {...pageProps} />
			</MultiplayerProvider>
		</>
	);
};

export default App;
