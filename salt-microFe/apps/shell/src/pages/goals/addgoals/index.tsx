import { Header } from "@repo/ui/header";
import React, { Suspense, lazy } from "react";
const AddGoals = lazy(() => import("goals/AddGoals"));
import { ServiceWrapper } from "@repo/ui/servicewrapper";
export default function AddGoalPage() {
  return (
    <ServiceWrapper>
      <Header route={true}>목표 추가하기</Header>
      <Suspense fallback={<div>로딩</div>}>
        <AddGoals />
      </Suspense>
    </ServiceWrapper>
  );
}
