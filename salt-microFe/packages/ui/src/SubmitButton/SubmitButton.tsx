import { ReactNode } from "react";
import { sizeVariants } from "./Styles/SubmitButton.css.ts";
type Submit = "submit";
interface SubmitButtonProps {
  variant?: keyof typeof sizeVariants;
  type: Submit;
  children: ReactNode;
}
export const SubmitButton = ({
  variant = "lg",
  type,
  children,
}: SubmitButtonProps) => {
  return (
    <button className={sizeVariants[variant]} type={type}>
      {children}
    </button>
  );
};
