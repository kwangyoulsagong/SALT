import AddGoalsContent from "@/component/AddGoals/AddGoalsContent";
import { SectionBoundary } from "@/components/Section/SectionBoundary";
import { Header } from "@repo/ui/header";
import { ServiceWrapper } from "@repo/ui/servicewrapper";

export default function AddGoalPage() {
  return (
    <ServiceWrapper>
      <Header route={true}>목표 추가하기</Header>
      <SectionBoundary name="목표 추가">
        <AddGoalsContent />
      </SectionBoundary>
    </ServiceWrapper>
  );
}
