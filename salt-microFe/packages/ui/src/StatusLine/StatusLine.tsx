import type { ReactNode } from "react";

import { StatusGraphic, type StatusGraphicKind } from "../StatusGraphic/StatusGraphic";
import { statusLineStyles } from "./styles/statusLine.css";

export interface StatusLineProps {
  kind: StatusGraphicKind;
  children: ReactNode;
  /** 결과가 바뀔 때 다시 읽어 주기 — 저장 완료 · 실패처럼 사용자가 방금 한 일의 결과면 켠다 */
  live?: boolean;
  className?: string;
}

/**
 * 상태 그래픽(sm) + 문장 한 줄 (FE-REQ-044 FR-12).
 *
 * 카드 안 "불러오지 못했어요" · "기록이 등록됐어요" 같은 한 줄이 회색 글자만으로 끝나지 않게 한다.
 * 화면 단위 결과는 `EmptyState` + `StatusGraphic` 을 쓴다.
 */
export const StatusLine = ({ kind, children, live = false, className }: StatusLineProps) => (
  <p className={`${statusLineStyles({ kind })} ${className || ""}`} aria-live={live ? "polite" : undefined}>
    <StatusGraphic kind={kind} size="sm" />
    <span>{children}</span>
  </p>
);
