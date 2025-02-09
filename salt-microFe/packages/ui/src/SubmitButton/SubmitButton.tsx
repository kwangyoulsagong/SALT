import { ReactNode } from "react";
import { Wrapper } from "./Styles/SubmitButton.css.ts";
type Submit = "submit";
interface SubmitButtonProps {
  type: Submit;
  children: ReactNode;
}
export const SubmitButton = ({ type, children }: SubmitButtonProps) => {
  return (
    <button className={Wrapper} type={type}>
      {children}
    </button>
  );
};
