import type { ReactNode } from "react";

import { StatusGraphic } from "../StatusGraphic/StatusGraphic";
import { signInGlassStyles as s } from "./styles/signInGlass.css";

export interface SignInGlassProps {
  /** 단추 글 — "로그인하고 {칸} 보기"처럼 누른 뒤 일이 보이게(문구는 부르는 쪽 `messages`) */
  actionLabel: string;
  /** 한 줄 설명(선택) — 무엇이 가려졌는지 */
  description?: string;
  /** 로그인 화면 주소 — 돌아올 주소(`?next=`)를 부르는 쪽이 붙인다 */
  href: string;
  /**
   * 흐리게 깔 자리 표시 — **실데이터를 넣지 않는다.** 모양만 보이는 틀(스켈레톤 · 빈 표)이다. 흐림은 보안이 아니라 모양이다:
   * 값은 애초에 응답에 없다(`FE-REQ-070` FR-8)
   */
  children?: ReactNode;
  /** 칸 높이 하한 — 자리 표시가 없을 때 칸이 납작해지지 않게 */
  minHeight?: number;
  className?: string;
}

/**
 * 로그인 칸 유리막(`FE-REQ-070` FR-6 · `ADR-011`) — 로그인 없이 보는 화면에서 사람 · AI 칸을 덮는다.
 *
 * 숨기지 않고 덮는다: "여기에 이런 칸이 있다"는 보이고, 단추 하나로 로그인한 뒤 같은 자리로 돌아온다.
 * 흐린 아래 칸은 `aria-hidden` · 포인터 0 — 스크린리더는 단추만 만난다. **자리 표시에 누를 것(링크 · 단추)을 넣지 않는다** —
 * 키보드가 닿는다(`inert` 는 React 18.2 가 불리언을 경고해 쓰지 않는다).
 */
export const SignInGlass = ({ actionLabel, description, href, children, minHeight, className }: SignInGlassProps) => (
  <div className={`${s.root} ${className || ""}`} style={minHeight ? { minHeight } : undefined}>
    {children ? (
      <div className={s.under} aria-hidden="true">
        {children}
      </div>
    ) : null}
    <div className={s.veil}>
      <StatusGraphic kind="blocked" size="sm" />
      {description ? <p className={s.description}>{description}</p> : null}
      <a className={s.action} href={href}>
        {actionLabel}
      </a>
    </div>
  </div>
);
