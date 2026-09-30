import { Header } from "@repo/ui/header";
import { Illustration } from "@repo/ui/illustration";
import { ServiceWrapper } from "@repo/ui/servicewrapper";

import { AddGoalForm } from "@/features/add-goal";
import { BlockBoundary } from "@/shared/ui";

import {
  ADD_GOAL_BLOCK_MIN_HEIGHT,
  ADD_GOAL_PAGE_MESSAGES,
} from "../model";

import { hero } from "./AddGoalPage.css";

/**
 * 목표 추가 (`/goals/addgoals`) — 서버 컴포넌트.
 *
 * 폼은 `features/add-goal` 의 클라이언트 잎에 있다.
 * 머리에 과녁 장면 하나 (`FE-REQ-044` P-23) — 서버 HTML 에는 마지막 프레임으로 들어간다.
 */
export const AddGoalPage = () => {
  return (
    <ServiceWrapper>
      <Header route={true}>{ADD_GOAL_PAGE_MESSAGES.header}</Header>
      <div className={hero}>
        <Illustration scene="target" size="md" />
      </div>
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
