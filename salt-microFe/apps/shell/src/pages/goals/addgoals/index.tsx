import AddGoalsContainer from "@/components/Goals/AddGoals/AddGoals";
import React, { Suspense, lazy } from "react";
const AddGoals = lazy(() => import("goals/AddGoals"));

export default function AddGoalPage() {
  return (
    <AddGoalsContainer>
      <Suspense fallback={<div>로딩</div>}>
        <AddGoals />
      </Suspense>
    </AddGoalsContainer>
  );
}
