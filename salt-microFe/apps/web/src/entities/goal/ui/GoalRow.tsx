import { GOAL_MESSAGES } from "../model/messages";
import { GoalListItem } from "../model/types";
import { H2Typography, pList, Wrapper } from "./GoalRow.css";

interface GoalRowProps {
  data: GoalListItem;
}

export const GoalRow = ({ data }: GoalRowProps) => {
  return (
    <ul className={Wrapper}>
      <li className={H2Typography}>{GOAL_MESSAGES.amountLabel(data.saved)}</li>
      <li className={pList}>{GOAL_MESSAGES.targetLabel(data.target)}</li>
    </ul>
  );
};

export default GoalRow;
