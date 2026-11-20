import type { ReactNode } from "react";

import { cardsSurface, frame, head, main, side as sideClass, title as titleClass, whiteSurface, withSide } from "./PageFrame.css";

export interface PageFrameProps {
  /** 화면 제목(h1 · 18/700) — 없으면 머리 줄을 그리지 않는다(제목을 본문 위젯이 그리는 화면) */
  title?: ReactNode;
  /** 제목 오른쪽 링크 · 버튼 자리 */
  actions?: ReactNode;
  /** 오른쪽 사이드 312(1024 이상) · 768~1023 은 본문 아래 — 내용은 도메인 패키지가 채운다(`FE-REQ-047` FR-12) */
  side?: ReactNode;
  /** 사이드 이름(화면 리더 `aside` 라벨) — 문구는 부르는 쪽 몫 */
  sideLabel?: string;
  /**
   * 패널 면 — 기본은 공용 패널(`#FBFCFD`), 흰 표 · 흰 띠가 주인공인 화면은 `white`,
   * 휴대폰 같은 카드 화면(회색 판 위 흰 카드 — 홈 · 저축 · 가계부 · 알림 · 설정)은 `cards`(`FE-REQ-076` FR-1 — 투자 zone 은 쓰지 않는다)
   */
  surface?: "panel" | "white" | "cards";
  /**
   * 본문이 가운데 정렬된 좁은 단(예: 코치 대화 720)일 때 그 폭 — 제목 줄을 같은 단에 맞춰 왼쪽 끝을 같게 한다
   * (2026-11-19 사용자 "정렬" — 제목이 화면 왼쪽, 대화가 가운데라 어긋났다)
   */
  headMaxWidth?: number;
  children: ReactNode;
}

/**
 * 데스크톱 화면 틀 — 제목 줄 · 본문 · (선택) 오른쪽 사이드(`FE-REQ-047` FR-2 · FR-7 · FR-12, `screen-desktop.md` §1).
 * 서버 컴포넌트. 본문 패널 면은 공용 `AppNavigation` 이 이미 칠했다 — 여기는 폭 · 여백 · 사이드 자리만. 페이지 최상위 `<div>`(`fsd-pages.md`)
 */
export const PageFrame = ({ title, actions, side, sideLabel, surface = "panel", headMaxWidth, children }: PageFrameProps) => (
  <div className={[frame, side ? withSide : "", surface === "white" ? whiteSurface : "", surface === "cards" ? cardsSurface : ""].filter(Boolean).join(" ")}>
    <div className={main}>
      {title || actions ? (
        <div
          className={head}
          // 동적 폭 하나라 인라인(`component-convention.md` — 계산값만 인라인)
          style={headMaxWidth ? { width: "100%", maxWidth: headMaxWidth, marginInline: "auto" } : undefined}
        >
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
