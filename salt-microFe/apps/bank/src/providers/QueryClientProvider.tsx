import { QueryClient } from "@tanstack/react-query";
import { NETWORK } from "../constants/api";
import dynamic from "next/dynamic";
const OriginalQueryClientProvider = dynamic(
  () => import("@tanstack/react-query").then((mod) => mod.QueryClientProvider),
  { ssr: false }
);
const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: true,
        refetchOnMount: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          if (error instanceof TypeError) return false;
          return failureCount < NETWORK.RETRY_COUNT;
        },
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

const QueryClientProvider = ({ children }: React.PropsWithChildren) => {
  const queryClient = createQueryClient();
  return (
    <OriginalQueryClientProvider client={queryClient}>
      {children}
    </OriginalQueryClientProvider>
  );
};
export default QueryClientProvider;
