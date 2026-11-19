import { ProgressBar } from "@repo/ui/progressBar";

import { signedPct, won } from "../lib/format";
import { PLAN_MESSAGES as M } from "../model/messages";
import type { MonthlySummaryVM, WeeklyPlanVM } from "../model/types";
import { amountLine, box, boxTitle, list, muted, progressRow } from "./plan.css";

/**
 * 원화 매수 비용(김프, `FE-REQ-022` E절) — 서버 `level` 그대로(프론트 재판정 0, `FE-REQ-023` FR-5). 사실만 · 차익거래 안내 0.
 * 값이 없으면 이 칸만 없다(금액은 그대로, FR-44)
 */
export const KimchiNote = ({ kimchi }: { kimchi: WeeklyPlanVM["kimchiPremium"] }) => {
  if (!kimchi) return null;
  const cost = kimchi.costKrwOnPlan;
  return (
    <section className={box} aria-label={M.kimchi.heading}>
      <h3 className={boxTitle}>{M.kimchi.heading}</h3>
      <ul className={list}>
        <li>{M.kimchi.premium(signedPct(kimchi.premiumPct))}</li>
        {cost !== null && cost > 0 ? <li>{M.kimchi.cost(won(cost))}</li> : null}
        {cost !== null && cost < 0 ? <li>{M.kimchi.discount(won(Math.abs(cost)))}</li> : null}
        <li>{M.kimchi.level[kimchi.level]}</li>
      </ul>
      <p className={muted}>{M.kimchi.context}</p>
    </section>
  );
};

/** 연속 · 누적 · 미실행 — 수만(점수 · 등급 · 비난 0, FR-53 · 54) */
export const StreakLine = ({ streak }: { streak: WeeklyPlanVM["streak"] }) => (
  <p className={muted}>
    {M.streak.line(streak.weeks, won(streak.cumulativeKrw))}
    {streak.plannedLast12 > 0 ? ` · ${M.streak.skipped(streak.skippedLast12, streak.plannedLast12)}` : null}
  </p>
);

/**
 * 이번 달 적립 합계(`FE-REQ-022` H절, v2 에서 `/plan` 안으로) — 합 · 비율 · 남은 일수 전부 서버 값(FR-81). 평가 문구 0(FR-85).
 * 진행 막대는 서버 % 를 0~1 로 옮겨 그릴 뿐이다 — 계획 0(`progressPct: null`)이면 막대 없이 합만
 */
export const MonthlySummaryView = ({ summary }: { summary: MonthlySummaryVM }) => (
  <section className={box} aria-label={M.monthly.heading}>
    <h3 className={boxTitle}>{M.monthly.heading}</h3>
    <p className={amountLine} aria-label={M.monthly.executedAria(won(summary.executedKrw))}>
      {M.monthly.executed(won(summary.executedKrw))}
    </p>
    {summary.progressPct === null ? (
      <p className={muted}>{M.monthly.noPlan(summary.daysLeft)}</p>
    ) : (
      <div className={progressRow}>
        <p className={muted}>{M.monthly.progress(won(summary.plannedKrw), summary.progressPct.toFixed(1), summary.daysLeft)}</p>
        <ProgressBar value={summary.progressPct / 100} label={M.monthly.progressLabel} />
      </div>
    )}
  </section>
);
