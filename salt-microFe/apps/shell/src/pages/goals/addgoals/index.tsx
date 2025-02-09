import AddGoalsContainer from "@/components/Goals/AddGoals/AddGoals";
import { Header } from "@repo/ui/header";
import React, { Suspense, lazy } from "react";
const AddGoals = lazy(() => import("goals/AddGoals"));

export default function AddGoalPage() {
  return (
    <AddGoalsContainer>
      <Header route={true}>목표 추가하기</Header>
      <Suspense fallback={<div>로딩</div>}>
        <AddGoals />
      </Suspense>
    </AddGoalsContainer>
  );
}
