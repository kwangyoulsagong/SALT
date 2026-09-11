import GoalsList from "@/component/GoalsApp/GoalsList/GoalsList";
import MyGoals from "@/component/GoalsApp/MyGoals/MyGoals";
import { Container } from "@repo/ui/container";
import { Card } from "@repo/ui/card";
import { FlexBox } from "@repo/ui/flexBox";

/**
 * 이전에는 `goals` remote 의 페이지였다. zone 통합 후 `apps/web` 로컬 컴포넌트다.
 * QueryClient·Redux Provider 는 `_app.tsx` 가 한 번만 건다.
 */
export default function GoalsApp() {
  return (
    <Container size="full">
      <FlexBox direction="column" gap="lg">
        <Card padding="none">
          <MyGoals />
        </Card>
        <Card>
          <GoalsList />
        </Card>
      </FlexBox>
    </Container>
  );
}
