import { QueryClient } from "@tanstack/react-query";
import { QueryClientProvider as TanStackQueryClientProvider } from "@tanstack/react-query";
import { NETWORK } from "../constants/api";

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
