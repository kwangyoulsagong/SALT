import { Header } from "@repo/ui/header";
import { ServiceWrapper } from "@repo/ui/servicewrapper";

import { AddGoalForm } from "@/features/add-goal";
import { BlockBoundary } from "@/shared/ui";

/**
 * 목표 추가 (`/goals/addgoals`) — 서버 컴포넌트.
 *
 * 폼은 `features/add-goal` 의 클라이언트 잎에 있다.
 */
const ADD_GOAL_BLOCK = { minHeight: 360, name: "목표 추가" } as const;

export const AddGoalPage = () => {
  return (
    <ServiceWrapper>
      <Header route={true}>목표 추가하기</Header>
      <BlockBoundary
        name={ADD_GOAL_BLOCK.name}
        minHeight={ADD_GOAL_BLOCK.minHeight}
      >
        <AddGoalForm />
      </BlockBoundary>
    </ServiceWrapper>
  );
};

export default AddGoalPage;
