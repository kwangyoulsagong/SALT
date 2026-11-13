import { PANEL_MESSAGES as M } from "../../model";
import { PanelRow } from "./PanelRow";
import * as s from "./ScenarioPanel.css";

/**
 * ③ 회사 사정 — 재료(공시 · 기사에서 뽑은 사실)가 순서 2 라 지금은 늘 빈 칸 문장(`FE-REQ-064` FR-9 ③). 칸을 숨기지 않는다 —
 * 무엇이 없는지 말하는 것도 데이터다. 재료가 생기면 서버가 네 칸(실적 · 오늘 일 · 업계 · 걸리는 점)을 준다
 */
export const CompanyRow = () => (
  <PanelRow kind="company">
    <p className={s.mainText}>{M.companyPending}</p>
    <p className={s.sub}>{M.companyPendingNote}</p>
  </PanelRow>
);
