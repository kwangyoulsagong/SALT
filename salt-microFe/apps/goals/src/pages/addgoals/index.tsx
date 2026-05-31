import { store } from "@/store/redux";
import AddGoalsContent from "@/component/AddGoals/AddGoalsContent";
import QueryClientProvider from "@/providers/QueryClientProvider";
import { Provider as ReduxProvider } from "react-redux";

export default function AddGoal() {
  return (
    <QueryClientProvider>
      <ReduxProvider store={store}>
        <AddGoalsContent />
      </ReduxProvider>
    </QueryClientProvider>
  );
}
