"use client";

// 클라이언트 잎: React Query 로 조회한다.
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Icon } from "@repo/ui/icon";

import { useGoalProgressList } from "../api";
import { GOAL_MESSAGES } from "../model/messages";
import { GoalListItem } from "../model/types";
import { GoalRow } from "./GoalRow";

export const GoalList = () => {
  const progressList = useGoalProgressList();

  if (progressList.isLoading) return <div>{GOAL_MESSAGES.loading}</div>;
  if (progressList.error) return <div>{GOAL_MESSAGES.loadFailed}</div>;
  return (
    <Container size="full">
      <FlexBox direction="column" gap="md">
        {progressList.data.map((value: GoalListItem) => (
          <FlexBox gap="md" align="center" key={value.id}>
            <Icon variant={value.tag} />
            <GoalRow data={value} />
          </FlexBox>
        ))}
      </FlexBox>
    </Container>
  );
};

export default GoalList;
