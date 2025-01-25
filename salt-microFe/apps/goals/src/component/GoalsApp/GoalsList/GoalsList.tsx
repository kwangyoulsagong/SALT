import { Icon } from "@repo/ui/icon";
import { Container } from "./GoalsList.css";
import ListWrapper from "./ListWrapper/ListWrapper";
import Goals from "./Goals/Goals";
import useGoals from "@/hooks/api/goals/useGoals";
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
    <section className={Container}>
      {goalsProcess.data.map((value: goalsProps) => (
        <ListWrapper>
          <Icon variant={value.tag} />
          <Goals data={value} />
        </ListWrapper>
      ))}
    </section>
  );
};
export default GoalsList;
