import { lazy, Suspense } from "react";

const Goals = lazy(() => import("goals/App"));
const GoalPage = () => {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <Goals />
    </Suspense>
  );
};
export default GoalPage;
