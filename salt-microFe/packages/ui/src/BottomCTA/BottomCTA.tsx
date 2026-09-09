import type { ReactNode } from "react";
import { actionsStyles, bottomCTAStyles } from "./styles/bottomCTA.css";

export type BottomCTALayout = "single" | "double";

export interface BottomCTAProps {
  /** CTA 버튼. `layout`에 따라 1칸 또는 2칸으로 늘어난다. */
  children: ReactNode;
  layout?: BottomCTALayout;
  /** 화면 하단에 고정한다. */
  fixed?: boolean;
  /** 버튼 왼쪽 슬롯. 관심 종목 토글 같은 아이콘 버튼을 넣는다. */
  leading?: ReactNode;
  className?: string;
}

/**
 * 화면 하단 주요 행동 영역.
 * `fixed`로 고정하면 safe-area 하단 여백이 함께 붙는다.
 */
export const BottomCTA = ({
  children,
  layout = "single",
  fixed = false,
  leading,
  className,
}: BottomCTAProps) => {
  return (
    <div className={`${bottomCTAStyles({ fixed })} ${className || ""}`}>
      {leading}
      <div className={actionsStyles({ layout })}>{children}</div>
    </div>
  );
};
