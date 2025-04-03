import { ReactNode } from "react";
import { Wrapper } from "./Circle.css";
interface circleProps {
  children: ReactNode;
  color: string;
}
const Circle = ({ children, color }: circleProps) => {
  return (
    <circle className={Wrapper} style={{ background: color }}>
      {children}
    </circle>
  );
};
export default Circle;
