import { ReactNode } from "react";
import { CardSize } from "./styles/Card.css";

type SizeType = "md" | "lg";
interface CardProps {
  size?: SizeType;
  children: ReactNode;
}

export const Card = ({ size = "md", children }: CardProps) => {
  return <section className={`${CardSize[size]}`}>{children}</section>;
};
