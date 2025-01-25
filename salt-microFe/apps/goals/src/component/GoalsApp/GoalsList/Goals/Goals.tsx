import { H2Typography, pList, Wrapper } from "./Goals.css";

const Goals = () => {
  return (
    <ul className={Wrapper}>
      <li className={H2Typography}>482,255원</li>
      <li className={pList}>목표 1,500,000원</li>
    </ul>
  );
};
export default Goals;
