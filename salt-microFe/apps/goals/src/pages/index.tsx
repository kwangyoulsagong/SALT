import GoalsList from "@/component/GoalsApp/GoalsList/GoalsList";
import MyGoals from "@/component/GoalsApp/MyGoals/MyGoals";
import Wrapper from "@/component/GoalsApp/Wrapper/Wrapper";
import { Card } from "@repo/ui/card";
export default function GoalsApp() {
  return (
    <Wrapper>
      <Card size="md">
        <MyGoals />
      </Card>
      <Card size="lg">
        <GoalsList />
      </Card>
    </Wrapper>
  );
}
