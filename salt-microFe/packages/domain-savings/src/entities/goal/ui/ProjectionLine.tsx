import { labelOr } from "@repo/web-shared/lib";

import { GOAL_MESSAGES } from "../model/messages";
import type { SavingsProjection } from "../model/types";
import * as s from "./goal.css";

export interface ProjectionLineProps {
  projection: SavingsProjection;
}

/**
 * 도달 시점(`FE-REQ-056` FR-5) — **한 점 날짜를 단정하지 않는다.** 구간이 있으면 "A ~ B", 없으면 "계획대로면 X" + 이유.
 * 적중 이력(채점)이 아직 없으면 그 이유를 늘 같이 적는다(FR-6: 둘 중 하나는 늘 있다).
 */
export const ProjectionLine = ({ projection: p }: ProjectionLineProps) => {
  const main =
    p.method === "empirical_quantile" && p.earlyMonth
      ? p.lateMonth
        ? GOAL_MESSAGES.projection.range(p.earlyMonth, p.lateMonth)
        : GOAL_MESSAGES.projection.openLate(p.earlyMonth)
      : p.planMonth
        ? GOAL_MESSAGES.projection.plan(p.planMonth)
        : "—";
  return (
    <section className={s.box} aria-label={GOAL_MESSAGES.projection.title}>
      <span className={s.label}>{GOAL_MESSAGES.projection.title}</span>
      <span className={s.value}>{main}</span>
      {p.method === "empirical_quantile" ? <span className={s.label}>{GOAL_MESSAGES.projection.basis(p.monthsOfHistory)}</span> : null}
      {p.method === "empirical_quantile" && p.planMonth ? <span className={s.label}>{GOAL_MESSAGES.projection.plan(p.planMonth)}</span> : null}
      {p.reason ? <span className={s.label}>{labelOr(GOAL_MESSAGES.projectionReason, p.reason, "")}</span> : null}
      {p.track === null ? <span className={s.label}>{GOAL_MESSAGES.projection.trackPending}</span> : null}
    </section>
  );
};
