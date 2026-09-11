import { H2Typography, pList, Wrapper } from "./Goals.css";
interface GoalsProps {
  data: {
    id: number;
    tag: string;
    saved: string;
    target: string;
  };
}
const Goals = ({ data }: GoalsProps) => {
  return (
    <ul className={Wrapper}>
      <li className={H2Typography}>{data.saved}원</li>
      <li className={pList}>목표 {data.target}원</li>
    </ul>
  );
};
export default Goals;
