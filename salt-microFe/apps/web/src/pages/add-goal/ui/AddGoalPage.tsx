import { Header } from "@repo/ui/header";
import { ServiceWrapper } from "@repo/ui/servicewrapper";

import { AddGoalForm } from "@/features/add-goal";
import { BlockBoundary } from "@/shared/ui";

import {
  ADD_GOAL_BLOCK_MIN_HEIGHT,
  ADD_GOAL_PAGE_MESSAGES,
} from "../model";

/**
 * 목표 추가 (`/goals/addgoals`) — 서버 컴포넌트.
 *
 * 폼은 `features/add-goal` 의 클라이언트 잎에 있다.
 */
export const AddGoalPage = () => {
  return (
    <ServiceWrapper>
      <Header route={true}>{ADD_GOAL_PAGE_MESSAGES.header}</Header>
      <BlockBoundary
        name={ADD_GOAL_PAGE_MESSAGES.blockName}
        minHeight={ADD_GOAL_BLOCK_MIN_HEIGHT}
      >
        <AddGoalForm />
      </BlockBoundary>
    </ServiceWrapper>
  );
};

export default AddGoalPage;
