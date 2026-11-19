import type { ReactNode } from "react";

import { frame, head, main, side as sideClass, title as titleClass, withSide } from "./PageFrame.css";

export interface PageFrameProps {
  /** 화면 제목(h1 · 18/700) — 없으면 머리 줄을 그리지 않는다(제목을 본문 위젯이 그리는 화면) */
  title?: ReactNode;
  /** 제목 오른쪽 링크 · 버튼 자리 */
  actions?: ReactNode;
  /** 오른쪽 사이드 312(1024 이상) · 768~1023 은 본문 아래 — 내용은 도메인 패키지가 채운다(`FE-REQ-047` FR-12) */
  side?: ReactNode;
  /** 사이드 이름(화면 리더 `aside` 라벨) — 문구는 부르는 쪽 몫 */
  sideLabel?: string;
  children: ReactNode;
}

/**
 * 데스크톱 화면 틀 — 제목 줄 · 본문 · (선택) 오른쪽 사이드(`FE-REQ-047` FR-2 · FR-7 · FR-12, `screen-desktop.md` §1).
 * 서버 컴포넌트. 본문 패널 면은 공용 `AppNavigation` 이 이미 칠했다 — 여기는 폭 · 여백 · 사이드 자리만. 페이지 최상위 `<div>`(`fsd-pages.md`)
 */
export const PageFrame = ({ title, actions, side, sideLabel, children }: PageFrameProps) => (
  <div className={side ? `${frame} ${withSide}` : frame}>
    <div className={main}>
      {title || actions ? (
        <div className={head}>
          {title ? <h1 className={titleClass}>{title}</h1> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </div>
    {side ? (
      <aside className={sideClass} aria-label={sideLabel}>
        {side}
      </aside>
    ) : null}
  </div>
);
