import { formatMonth, formatWon, GOAL_BOARD_MESSAGES as M, GOAL_MESSAGES } from "../model/messages";
import type { SavingsGoal } from "../model/types";
import { reachText } from "../lib/reachText";
import { GoalTemplateIcon } from "./GoalTemplateIcon";
import * as s from "./goalBoard.css";

/** 막대 폭(%) — 그리기 전용(값은 서버 숫자, 화면은 길이만 늘이고 줄인다) */
const pct = (value: number, max: number) => (max <= 0 ? 0 : Math.min(100, Math.max(0, (value / max) * 100)));

/**
 * 이번 달 계획 대비 — 목표마다 넣은 돈(채움) · 월 계획(세로 표지). 같은 눈금(목표들 중 가장 큰 값)으로 그려 목표끼리 견줄 수 있다.
 * 상태(계획만큼 · 적게 · 계획 없음)는 서버 `milestone.state` 그대로 — 색 + 글(색만으로 전하지 않는다)
 */
export const GoalPlanBars = ({ goals }: { goals: SavingsGoal[] }) => {
  const max = Math.max(0, ...goals.map((g) => Math.max(g.milestone.deposited, g.milestone.plan ?? 0)));
  return (
    <ul className={s.rows}>
      {goals.map((goal) => {
        const { deposited, plan, state } = goal.milestone;
        const tone = plan === null ? "none" : state === "plan_met" || state === "reached" ? "met" : "under";
        return (
          <li key={goal.id} className={s.row} aria-label={`${goal.title} ${GOAL_MESSAGES.milestoneState[state]}`}>
            <span className={s.plate}>
              <GoalTemplateIcon template={goal.template} />
            </span>
            <span className={s.name}>{goal.title}</span>
            <span className={s.track} aria-hidden>
              <span className={`${s.fill} ${s.fillTone[tone]}`} style={{ width: `${pct(deposited, max)}%` }} />
              {plan !== null ? <span className={s.planMark} style={{ left: `calc(${pct(plan, max)}% - 1px)` }} /> : null}
            </span>
            <span className={s.figure}>{plan === null ? `${formatWon(deposited)} · ${M.noPlan}` : M.depositedOfPlan(formatWon(deposited), formatWon(plan))}</span>
          </li>
        );
      })}
    </ul>
  );
};

/** "2027-03" → 달 순번(그리기 전용 — 축 위 자리만 정한다) */
const monthIndex = (yearMonth: string) => {
  const [year, month] = yearMonth.split("-").map(Number);
  return year * 12 + (month - 1);
};

/**
 * 도달 예상 — 지금 달부터 가장 먼 끝 달까지 축 하나 위에, 목표마다 구간(지난 적립에서 — 이른 끝 ~ 늦은 끝) · 점(월 계획대로일 때).
 * 한 점 날짜를 단정하지 않는다 — 구간이 있으면 막대, 계획 달만 있으면 점, 둘 다 없으면 서버 이유 한 줄(`reachText`)
 */
export const GoalReachTimeline = ({ goals, currentMonth }: { goals: SavingsGoal[]; currentMonth: string }) => {
  const start = monthIndex(currentMonth);
  const ends = goals.flatMap((g) => [g.projection.lateMonth, g.projection.earlyMonth, g.projection.planMonth]).filter((m): m is string => m !== null);
  if (ends.length === 0) return <p className={s.caption}>{M.reachNone}</p>;
  const lastMonth = ends.reduce((a, b) => (monthIndex(b) > monthIndex(a) ? b : a));
  const span = Math.max(1, monthIndex(lastMonth) - start);
  const at = (m: string) => pct(monthIndex(m) - start, span);
  return (
    <>
      <div className={s.axis} aria-hidden>
        <span />
        <span />
        <span className={s.axisLabels}>
          <span>{M.now}</span>
          <span>{formatMonth(lastMonth)}</span>
        </span>
        <span />
      </div>
      <ul className={s.rows}>
        {goals.map((goal) => {
          const p = goal.projection;
          return (
            <li key={goal.id} className={s.row}>
              <span className={s.plate}>
              <GoalTemplateIcon template={goal.template} />
            </span>
              <span className={s.name}>{goal.title}</span>
              <span className={s.lane} aria-hidden>
                {p.earlyMonth ? (
                  <span className={s.range} style={{ left: `${at(p.earlyMonth)}%`, width: `${Math.max(2, at(p.lateMonth ?? lastMonth) - at(p.earlyMonth))}%` }} />
                ) : null}
                {p.planMonth ? <span className={s.dot} style={{ left: `${at(p.planMonth)}%` }} /> : null}
              </span>
              <span className={s.figure}>{reachText(p)}</span>
            </li>
          );
        })}
      </ul>
      <p className={s.caption}>{M.reachCaption}</p>
    </>
  );
};
