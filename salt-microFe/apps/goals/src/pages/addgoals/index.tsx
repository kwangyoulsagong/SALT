import dynamic from "next/dynamic";
import { store } from "@/store/redux";
import AddGoalsContent from "@/component/AddGoals/AddGoalsContent";
import QueryClientProvider from "@/providers/QueryClientProvider";
const ReduxProvider = dynamic(
  () => import("react-redux").then((mod) => mod.Provider),
  {
    ssr: false,
  }
);

export default function AddGoal() {
  return (
    <QueryClientProvider>
      <ReduxProvider store={store}>
        <AddGoalsContent />
      </ReduxProvider>
    </QueryClientProvider>
  );
}
