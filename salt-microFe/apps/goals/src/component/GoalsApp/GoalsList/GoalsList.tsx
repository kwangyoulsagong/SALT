import { Icon } from "@repo/ui/icon";
import { Container } from "./GoalsList.css";
import ListWrapper from "./ListWrapper/ListWrapper";
import Goals from "./Goals/Goals";

const GoalsList = () => {
  return (
    <section className={Container}>
      <ListWrapper>
        <Icon variant="trip" />
        <Goals />
      </ListWrapper>
      <ListWrapper>
        <Icon variant="car" />
        <Goals />
      </ListWrapper>
    </section>
  );
};
export default GoalsList;
