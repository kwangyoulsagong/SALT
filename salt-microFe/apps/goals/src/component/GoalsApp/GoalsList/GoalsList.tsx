import { Container } from "./GoalsList.css";
import ListWrapper from "./ListWrapper/ListWrapper";
import { Icon } from "@repo/ui/icon";
const GoalsList = () => {
  return (
    <section className={Container}>
      <ListWrapper>
        <Icon variant="travel" />
      </ListWrapper>
      <ListWrapper>afsdfas</ListWrapper>
    </section>
  );
};
export default GoalsList;
