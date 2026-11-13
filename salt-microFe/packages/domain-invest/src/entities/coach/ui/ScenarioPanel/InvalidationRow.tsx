import type { ScenarioHorizonView } from "@repo/core/coach";

import { formatPrice } from "@repo/web-shared/lib";

import { PANEL_MESSAGES as M } from "../../model";
import { PanelRow } from "./PanelRow";
import * as s from "./ScenarioPanel.css";

const MINUS = "−";
const signedPct = (pct: number) => (pct === 0 ? "0%" : `${pct > 0 ? "+" : MINUS}${Math.abs(pct).toFixed(1)}%`);

/**
 * ④ 이 판단이 틀리는 때 — 틀리는 선 가격(서버 `invalidation`) · 그 % (서버 `range.lowPct`) · 게이지(지금 ↔ 틀리는 선).
 * 게이지 위치는 그리기 좌표뿐(눈금 폭 = 나빴던 10% 크기의 1.4배, 4% 밑으로 줄이지 않는다 — 시안 §6)
 */
export const InvalidationRow = ({ view }: { view: ScenarioHorizonView }) => {
  const low = view.range?.lowPct ?? null;
  if (view.tier === "defect" || view.invalidation === null || low === null) {
    return (
      <PanelRow kind="invalidation">
        <p className={s.sub}>{M.invalidationNone}</p>
      </PanelRow>
    );
  }
  const span = Math.max(4, Math.abs(low) * 1.4);
  const at = `${100 - (Math.abs(low) / span) * 100}%`;
  return (
    <PanelRow kind="invalidation">
      <p className={s.mainText}>{M.invalidationLine(`${formatPrice(view.invalidation)}원`, signedPct(low))}</p>
      <div className={s.gauge} aria-hidden="true">
        <span className={s.gaugeAxis} />
        <span className={s.gaugeBad} style={{ left: at }} />
        <span className={s.gaugeTick} style={{ left: at }} />
        <span className={s.gaugeKnob} />
        <span className={s.gaugeLabel.bad} style={{ left: at }}>
          {M.gaugeLine}
        </span>
        <span className={s.gaugeLabel.now}>{M.gaugeNow}</span>
      </div>
      <p className={s.sub}>{M.invalidationNote}</p>
    </PanelRow>
  );
};
