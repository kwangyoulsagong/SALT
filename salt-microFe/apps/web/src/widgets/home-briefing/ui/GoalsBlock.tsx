import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";
import { FlexBox } from "@repo/ui/flexBox";

import { GoalList, GoalSummary } from "@/entities/goal";

/**
 * 목표 블록. **조합만 한다** (`fsd-widgets.md`).
 *
 * 이전에는 `goals` remote 의 페이지였다. zone 통합(FE-REQ-007) 후 로컬 컴포넌트가 됐고,
 * FSD 전환에서 위젯으로 내려왔다.
 */
export const GoalsBlock = () => {
  return (
    <Container size="full">
      <FlexBox direction="column" gap="lg">
        <Card padding="none">
          <GoalSummary />
        </Card>
        <Card>
          <GoalList />
        </Card>
      </FlexBox>
    </Container>
  );
};

export default GoalsBlock;
