import { Card } from "@repo/ui/card";
import { Container } from "@repo/ui/container";

import { GoalList } from "@/entities/goal";

/**
 * 목표 목록 블록. **조합만 한다** (`fsd-widgets.md`).
 *
 * 홈은 도메인 요약 카드만 그리는 것이 규칙이다(`ADR-005` §2). 이 목록은 **저축 목록 화면(`/goals`)이 아직 없어서**
 * 남겨 둔다 — 지우면 목표를 볼 곳이 없다. 저축 zone(`FE-REQ-056`)이 `/goals` 를 만들 때 지운다.
 * 요약 숫자(모은 돈 · 진행 중 개수)는 저축 카드가 준다 — 같은 숫자를 두 번 그리지 않게 `GoalSummary` 는 뺐다.
 */
export const GoalsBlock = () => {
  return (
    <Container size="full">
      <Card>
        <GoalList />
      </Card>
    </Container>
  );
};

export default GoalsBlock;
