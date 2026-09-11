import { ReactNode } from "react";
import { BadgeFontStyle, BadgeStyle } from "./Badge.css";

const Badge = ({ children }: { children: ReactNode }) => {
  return (
    <div className={BadgeStyle}>
      <span className={BadgeFontStyle}>{children}</span>
    </div>
  );
};

export default Badge;
