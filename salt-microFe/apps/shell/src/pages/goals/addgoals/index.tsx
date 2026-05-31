import dynamic from "next/dynamic";
import {
  createRemoteLoading,
  RemoteBoundary,
} from "@/components/Remote/RemoteBoundary";
import { Header } from "@repo/ui/header";
import { ServiceWrapper } from "@repo/ui/servicewrapper";

const AddGoals = dynamic(() => import("goals/AddGoals"), {
  loading: createRemoteLoading("목표 추가"),
});

export default function AddGoalPage() {
  return (
    <ServiceWrapper>
      <Header route={true}>목표 추가하기</Header>
      <RemoteBoundary name="목표 추가">
        <AddGoals />
      </RemoteBoundary>
    </ServiceWrapper>
  );
}
