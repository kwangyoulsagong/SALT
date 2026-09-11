import { Text } from "@repo/ui/text";

import { GOAL_MESSAGES } from "../model/messages";
import { GoalProgress } from "../model/types";
import { Container } from "./GoalProgressFooter.css";
import { ProcessCard } from "./ProcessCard";
import { Process } from "./ProcessCard.css";
import { ProcessWrapper } from "./ProcessWrapper";

interface GoalProgressFooterProps {
  process: GoalProgress;
}

export const GoalProgressFooter = ({ process }: GoalProgressFooterProps) => {
  return (
    <footer className={Container}>
      <ProcessWrapper>
        <ProcessCard>
          <Text variant="caption" color="muted">
            {GOAL_MESSAGES.progress}
          </Text>
          <span className={Process}>{process.progress}</span>
        </ProcessCard>
        <ProcessCard>
          <Text variant="caption" color="muted">
            {GOAL_MESSAGES.complete}
          </Text>
          <span className={Process}>{process.complete}</span>
        </ProcessCard>
        <ProcessCard>
          <Text variant="caption" color="muted">
            {GOAL_MESSAGES.dday}
          </Text>
          <span className={Process}>{process.dday}</span>
        </ProcessCard>
        <ProcessCard>
          <Text variant="caption" color="muted">
            {GOAL_MESSAGES.achievementRate}
          </Text>
          <span className={Process}>{process.percent}%</span>
        </ProcessCard>
      </ProcessWrapper>
    </footer>
  );
};

export default GoalProgressFooter;
