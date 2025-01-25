import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import "@/styles/globals.css";
const ReduxProvider = dynamic(
  () => import("react-redux").then((mod) => mod.Provider),
  {
    ssr: false,
  }
);
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
