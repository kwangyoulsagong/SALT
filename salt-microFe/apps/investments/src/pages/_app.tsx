import type { AppProps } from "next/app";
import "@/styles/globals.css";
import QueryClientProvider from "@/providers/QueryClientProvider";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider>
      <Component {...pageProps} />
    </QueryClientProvider>
  );
}
