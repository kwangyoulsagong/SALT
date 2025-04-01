import BankRegistration from "@/component/AddBank/BankRegistration";
import QueryClientProvider from "@/providers/QueryClientProvider";
import dynamic from "next/dynamic";
const ReduxProvider = dynamic(
  () => import("react-redux").then((mod) => mod.Provider),
  {
    ssr: false,
  }
);
export default function AddBanking() {
  return (
    <QueryClientProvider>
      <BankRegistration />
    </QueryClientProvider>
  );
}
