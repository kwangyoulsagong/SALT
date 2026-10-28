"use client";

import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider as TanStackQueryClientProvider } from "@tanstack/react-query";
import { retryWhileRetriable } from "@/shared/api";
import { NETWORK } from "@/shared/config";

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        // 4xx 는 다시 불러도 같다 — 전에는 모든 실패를 두 번 더 불러 모르는 종목 404 가 3초 뒤에야 보였다(`FE-REQ-012` FR-41)
        retry: retryWhileRetriable(NETWORK.RETRY_COUNT),
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        staleTime: 1000 * 60 * 10,
        gcTime: 1000 * 60 * 60,
        enabled: true,
      },
      mutations: {
        onError: (error) => {
          console.error("뮤테이션 오류:", error);
        },
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

const getQueryClient = () => {
  if (typeof window === "undefined") {
    return createQueryClient();
  }

  if (!browserQueryClient) {
    browserQueryClient = createQueryClient();
  }

  return browserQueryClient;
};

const QueryClientProvider = ({ children }: React.PropsWithChildren) => {
  const queryClient = getQueryClient();

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
    </TanStackQueryClientProvider>
  );
};
export default QueryClientProvider;
