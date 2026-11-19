import { GOAL_MESSAGES } from "../model/messages";
import * as s from "./goal.css";

/** 한 판에 보일 도장 수 — 넘치면 개수 글만 늘어난다(판이 화면을 밀어내지 않게) */
const BOARD_MAX = 30;

/** 도장판(`FE-REQ-056` FR-10) — 개수는 서버 `stampCount`(첫 도장 + 적립). 칭찬 문구 없이 개수만 */
export interface StampBoardProps {
  count: number;
  /** 제목이 있는 패널 안(상세 기록 탭 — `FE-REQ-060` FR-9) — 상자 · 제목 없이(같은 제목 두 번 · 상자 안 상자 0) */
  bare?: boolean;
}

export const StampBoard = ({ count, bare = false }: StampBoardProps) => (
  <div className={bare ? s.bare : s.box} aria-label={GOAL_MESSAGES.stamps.title}>
    <div className={s.row}>
      {bare ? null : <span className={s.label}>{GOAL_MESSAGES.stamps.title}</span>}
      <span className={s.value}>{GOAL_MESSAGES.stamps.count(count)}</span>
    </div>
    <ul className={s.stamps} aria-hidden="true">
      {Array.from({ length: Math.min(count, BOARD_MAX) }, (_, i) => (
        <li key={i} className={s.stamp} />
      ))}
    </ul>
    <span className={s.label}>{GOAL_MESSAGES.stamps.first}</span>
  </div>
);
