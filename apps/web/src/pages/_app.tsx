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
			<MultiplayerProvider apiEndpoint="">
				<Component {...pageProps} />
			</MultiplayerProvider>
		</>
	);
};

export default App;
