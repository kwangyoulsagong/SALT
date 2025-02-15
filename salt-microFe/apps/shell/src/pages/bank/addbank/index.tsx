import { Header } from "@repo/ui/header";
import { ServiceWrapper } from "@repo/ui/servicewrapper";
import React, { Suspense, lazy } from "react";
const AddBanks = lazy(() => import("bank/AddBank"));

export default function AddGoalPage() {
  return (
    <ServiceWrapper>
      <Header route={true}>계좌 등록</Header>
      <Suspense fallback={<div>로딩</div>}>
        <AddBanks />
      </Suspense>
    </ServiceWrapper>
  );
}
