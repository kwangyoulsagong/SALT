import type { PanelMine } from "@repo/core/coach";

import { formatPrice } from "@repo/web-shared/lib";

import { PANEL_MESSAGES as M } from "../../model";
import * as s from "./ScenarioPanel.css";

const MINUS = "−";
const signedPct = (pct: number) => (pct === 0 ? "0%" : `${pct > 0 ? "+" : MINUS}${Math.abs(pct).toFixed(1)}%`);
const toneOf = (pct: number) => (pct > 0 ? "up" : pct < 0 ? "down" : "flat");

/**
 * 내 기준 한 줄 — 보유가 있을 때만 · 나만 보여요(`FE-REQ-064` FR-11). 순서는 내가 정한 선까지 거리(앞) → 내 평단 대비(뒤).
 * 매입가 숨김이면 서버가 평단 · 평가 손익을 빼고 준다 — 화면은 있는 것만 그린다. 숫자는 전부 서버 값
 */
export const MineLine = ({ mine }: { mine: { status: "ok" | "degraded"; view: PanelMine | null } }) => {
  const v = mine.view;
  return (
    <p className={s.mine}>
      <span className={s.mineHead}>{M.mineHead}</span>
      {mine.status === "degraded" || !v ? (
        <span>{M.mineUnavailable}</span>
      ) : (
        <>
          <span>
            {v.line && v.gapToLinePct !== null
              ? M.mineLine[v.line.kind](`${formatPrice(v.line.price)}원`, signedPct(v.gapToLinePct))
              : M.mineNoLine}
          </span>
          {v.averageBuyPrice !== null && v.unrealizedProfitRate !== null && (
            <span className={s.tone[toneOf(v.unrealizedProfitRate)]}>
              · {M.mineAvg(`${formatPrice(v.averageBuyPrice)}원`, signedPct(v.unrealizedProfitRate))}
            </span>
          )}
        </>
      )}
      <span className={s.onlyYou}>{M.mineOnlyYou}</span>
    </p>
  );
};
