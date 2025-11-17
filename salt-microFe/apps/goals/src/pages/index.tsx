import GoalsList from "@/component/GoalsApp/GoalsList/GoalsList";
import MyGoals from "@/component/GoalsApp/MyGoals/MyGoals";
import { Container } from "@repo/ui/container";
import QueryClientProvider from "@/providers/QueryClientProvider";
import { Card } from "@repo/ui/card";
import { FlexBox } from "@repo/ui/flexBox";
export default function GoalsApp() {
  return (
    <QueryClientProvider>
      <Container size="full">
        <FlexBox direction="column" gap="xl">
          <Card padding="none">
            <MyGoals />
          </Card>
          <Card>
            <GoalsList />
          </Card>
        </FlexBox>
      </Container>
    </QueryClientProvider>
  );
}
