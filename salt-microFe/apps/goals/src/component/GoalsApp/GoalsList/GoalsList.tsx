import { Icon } from "@repo/ui/icon";
import { Container } from "./GoalsList.css";
import ListWrapper from "./ListWrapper/ListWrapper";

const GoalsList = () => {
  return (
    <section className={Container}>
      <ListWrapper>
        <Icon variant="trip" />
      </ListWrapper>
      <ListWrapper>
        <Icon variant="car" />
      </ListWrapper>
    </section>
  );
};
export default GoalsList;
