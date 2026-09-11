import { ReactNode } from "react";
import { BadgeFontStyle, BadgeStyle } from "./NewsBadge.css";

export const NewsBadge = ({ children }: { children: ReactNode }) => {
  return (
    <div className={BadgeStyle}>
      <span className={BadgeFontStyle}>{children}</span>
    </div>
  );
};

export default NewsBadge;
