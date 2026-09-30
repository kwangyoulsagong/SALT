"use client";

// 클라이언트 잎: React Query 로 조회한다.
import { Container } from "@repo/ui/container";
import { EmptyState } from "@repo/ui/emptyState";
import { FlexBox } from "@repo/ui/flexBox";
import { Icon } from "@repo/ui/icon";
import { Illustration } from "@repo/ui/illustration";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import { useGoalProgressList } from "../api";
import { GOAL_MESSAGES } from "../model/messages";
import { GoalListItem } from "../model/types";
import { GoalRow } from "./GoalRow";

export const GoalList = () => {
  const progressList = useGoalProgressList();

  if (progressList.isPending) {
    return (
      <div role="status" aria-busy="true" aria-label={GOAL_MESSAGES.loading}>
        <Skeleton lines={3} height={20} />
      </div>
    );
  }
  if (progressList.isError) return <StatusLine kind="error">{GOAL_MESSAGES.loadFailed}</StatusLine>;
  // 빈 배열이면 빈 카드가 아니라 장면 한 장 (FE-REQ-044 P-10). 추가 버튼은 바로 위 요약 카드에 있다
  if (progressList.data.length === 0) {
    return (
      <EmptyState
        iconFrame="none"
        icon={<Illustration scene="target" size="sm" />}
        title={GOAL_MESSAGES.emptyTitle}
        description={GOAL_MESSAGES.emptyDescription}
      />
    );
  }
  return (
    <Container size="full">
      <FlexBox direction="column" gap="md">
        {progressList.data.map((value: GoalListItem) => (
          <FlexBox gap="md" align="center" key={value.id}>
            {value.tag && <Icon variant={value.tag} />}
            <GoalRow data={value} />
          </FlexBox>
        ))}
      </FlexBox>
    </Container>
  );
};

export default GoalList;
