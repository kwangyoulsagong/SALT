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
import Layout from "@/components/Layout";
import AuthWrapper from "@/components/Auth/AuthWrapper/AuthWrapper";

if (process.env.NODE_ENV === "development") {
  // browser환경에서만 mocking
  if (typeof window !== "undefined") {
    const { worker } = require("@/mock/browser");
    worker.start();
  }
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider>
      <ReduxProvider store={store}>
        <AuthWrapper>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </AuthWrapper>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
