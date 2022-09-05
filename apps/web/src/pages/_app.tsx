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
			<MultiplayerProvider>
				<Component {...pageProps} />
			</MultiplayerProvider>
		</>
	);
};

export default App;
