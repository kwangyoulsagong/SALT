import { ReactNode } from "react";
import { pVariant } from "./styles/P.css.ts";
type variantType = "email" | "primary" | "secondary" | "third";
interface pProps {
  variant?: variantType;
  children: ReactNode;
}
export const P = ({ variant = "primary", children }: pProps) => {
  return <p className={pVariant[variant]}>{children}</p>;
};
