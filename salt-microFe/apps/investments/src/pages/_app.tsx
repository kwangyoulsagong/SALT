import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import "@/styles/globals.css";
const ReduxProvider = dynamic(
  () => import("react-redux").then((mod) => mod.Provider),
  {
    ssr: false,
  }
);
import QueryClientProvider from "@/providers/QueryClientProvider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
