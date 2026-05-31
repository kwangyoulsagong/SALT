import type { AppProps } from "next/app";
import "@/styles/globals.css";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "../store/redux";
import QueryClientProvider from "@/providers/QueryClientProvider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider>
      <ReduxProvider store={store}>
        <Component {...pageProps} />
      </ReduxProvider>
    </QueryClientProvider>
  );
}
