import type { ReactNode } from "react";
import {
  bannerStyles,
  bodyStyles,
  descriptionStyles,
  iconStyles,
  titleStyles,
} from "./styles/banner.css";

export type BannerTone = "info" | "warning" | "error" | "success" | "neutral";

export interface BannerProps {
  children: ReactNode;
  tone?: BannerTone;
  title?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** 면책·경고·안내 문구를 담는 띠. 색만으로 심각도를 전달하지 않도록 문구를 함께 쓴다. */
export const Banner = ({
  children,
  tone = "info",
  title,
  icon,
  className,
}: BannerProps) => {
  return (
    <div
      role={tone === "error" || tone === "warning" ? "alert" : "note"}
      className={`${bannerStyles({ tone })} ${className || ""}`}
    >
      {icon ? (
        <span className={iconStyles} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      <div className={bodyStyles}>
        {title ? <p className={titleStyles}>{title}</p> : null}
        <div className={descriptionStyles}>{children}</div>
      </div>
    </div>
  );
};
