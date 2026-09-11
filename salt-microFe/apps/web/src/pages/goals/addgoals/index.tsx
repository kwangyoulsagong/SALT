import AddGoalsContent from "@/component/AddGoals/AddGoalsContent";
import BlockBoundary from "@/components/Block/BlockBoundary";
import { Header } from "@repo/ui/header";
import { ServiceWrapper } from "@repo/ui/servicewrapper";

/**
 * 목표 추가 (`/goals/addgoals`) — 서버 컴포넌트.
 *
 * 폼은 `AddGoalsContent` 클라이언트 잎에 있다.
 */
export default function AddGoalPage() {
  return (
    <ServiceWrapper>
      <Header route={true}>목표 추가하기</Header>
      <BlockBoundary name="목표 추가" minHeight={360}>
        <AddGoalsContent />
      </BlockBoundary>
    </ServiceWrapper>
  );
}
