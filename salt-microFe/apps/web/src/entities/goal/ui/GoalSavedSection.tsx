"use client";

// 클라이언트 잎: 상태·effect·memo 를 갖는다. barrel 로 노출되므로 경계를 스스로 갖는다.
import { Button } from "@repo/ui/button";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";
import { Heading } from "@repo/ui/heading";
import { Icon } from "@repo/ui/icon";
import { Text } from "@repo/ui/text";
import { useRouter } from "next/navigation";

import { ROUTES } from "@/shared/config";

import { GOAL_MESSAGES } from "../model/messages";
import { GoalSaved } from "../model/types";
import { SaveInformation } from "./SaveInformation";
import { SavedWrapper } from "./SavedWrapper";

interface GoalSavedSectionProps {
  saved: GoalSaved;
}

/**
 * 표시 전용이다. 버튼은 **화면 이동**만 한다 — 여기서 mutation 을 부르지 않는다
 * (`fsd-entities.md`). 목표를 실제로 만드는 것은 `features/add-goal` 이다.
 */
export const GoalSavedSection = ({ saved }: GoalSavedSectionProps) => {
  const router = useRouter();

  return (
    <Container size="full">
      <FlexBox justify="between" align="center">
        <SavedWrapper>
          <Icon url={saved.thumbnail} />
          <SaveInformation>
            <Heading level={2}>{GOAL_MESSAGES.amountLabel(saved.money)}</Heading>
            <Text color="muted">{GOAL_MESSAGES.savedCaption}</Text>
          </SaveInformation>
        </SavedWrapper>
        <Button
          variant="primary"
          size="sm"
          onClick={() => router.push(ROUTES.addGoal)}
        >
          {GOAL_MESSAGES.addButton}
        </Button>
      </FlexBox>
    </Container>
  );
};

export default GoalSavedSection;
