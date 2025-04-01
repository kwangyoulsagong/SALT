import { ReactNode } from "react";
import { sizeVariants } from "./Styles/SubmitButton.css.ts";
type Submit = "submit";
interface SubmitButtonProps {
  variant?: keyof typeof sizeVariants;
  type: Submit;
  children: ReactNode;
  onClick?: () => void;
}
export const SubmitButton = ({
  variant = "lg",
  type,
  children,
  onClick,
}: SubmitButtonProps) => {
  return (
    <button className={sizeVariants[variant]} onClick={onClick} type={type}>
      {children}
    </button>
  );
};
