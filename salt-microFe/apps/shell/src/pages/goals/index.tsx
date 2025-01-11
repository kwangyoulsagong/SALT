import { useAppSelector } from "@/hooks/redux/hooks";
import { lazy, Suspense } from "react";

const Goals = lazy(() => import("goals/App"));
const GoalPage = () => {
  const profile = useAppSelector((state) => state.auth);
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <Goals nickname={profile.user?.nickname} />
    </Suspense>
  );
};
export default GoalPage;
