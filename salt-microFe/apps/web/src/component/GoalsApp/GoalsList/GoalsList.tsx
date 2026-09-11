import { Icon } from "@repo/ui/icon";
import Goals from "./Goals/Goals";
import useGoals from "@/hooks/api/goals/useGoals";
import { FlexBox } from "@repo/ui/flexBox";
import { Container } from "@repo/ui/container";
interface goalsProps {
  id: number;
  tag: "trip" | "car";
  saved: string;
  target: string;
}
const GoalsList = () => {
  const { goalsProcess } = useGoals();
  if (goalsProcess.isLoading) return <div>Loading...</div>;
  if (goalsProcess.error) return <div>Error loading goals</div>;
  return (
    <Container size="full">
      <FlexBox direction="column" gap="md">
        {goalsProcess.data.map((value: goalsProps) => (
          <FlexBox gap="md" align="center" key={value.id}>
            <Icon variant={value.tag} />
            <Goals data={value} />
          </FlexBox>
        ))}
      </FlexBox>
    </Container>
  );
};
export default GoalsList;
