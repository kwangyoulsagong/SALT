"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";

import { hasApiStatus } from "@repo/web-shared/api";
import { ROUTES } from "@repo/web-shared/config";
import { labelOr } from "@repo/web-shared/lib";
import { BackNav, DetailTabs, SideRow } from "@repo/web-shared/ui";
import { detailPanel, detailPanelHead, detailPanelTitle } from "@repo/web-shared/ui/surface.css";

import {
  formatWon,
  GOAL_MESSAGES,
  GoalScene,
  MilestoneBox,
  MissedMonthsBox,
  PostcardList,
  ProjectionLine,
  StampBoard,
  templateTag,
  TodayMoneyBox,
  useSavingsGoal,
  type SavingsDeposit,
  type SavingsGoalDetail,
} from "@/entities/goal";
import { ItemUnitEditor, ITEM_UNIT_MESSAGES } from "@/features/add-item-unit";
import { EmergencyCompare, EMERGENCY_MESSAGES } from "@/features/compare-emergency";
import { DepositForm } from "@/features/record-deposit";

import { GOAL_DETAIL_PAGE as M } from "../model";
import * as s from "./goalDetail.css";

/** 적립 한 줄의 보조 — 옮겨 온 잔액 · 챌린지 · 메모 */
const depositNote = (d: SavingsDeposit): string | null =>
  d.source === "imported_balance" ? M.importedBalance : d.source === "saved_by_challenge" ? M.savedByChallenge : d.note;

const Back = ({ title }: { title?: string }) => (
  <BackNav
    label={M.back}
    trailLabel={M.trailLabel}
    fallbackHref={ROUTES.goals}
    crumbs={title ? [{ label: M.trailSavings, href: ROUTES.goals }, { label: title }] : [{ label: M.trailSavings, href: ROUTES.goals }]}
  />
);

/** 패널 하나 — 머리 44(제목 13/600) + 본문. 면은 상세 패널(`FE-REQ-049`) */
const Panel = ({ title, children }: { title: string; children: ReactNode }) => (
  <section className={detailPanel} aria-label={title}>
    <div className={detailPanelHead}>
      <h2 className={detailPanelTitle}>{title}</h2>
    </div>
    {children}
  </section>
);

/**
 * 목표 상세(`FE-REQ-056` FR-4~10 → `FE-REQ-060` FR-9 · FR-11) — 머리 2줄(뒤로 · 이름 · 템플릿 / 앞 숫자 18/700 · 진척) → 알약 탭(진행 · 기록 · 회고) →
 * 패널 + 오른쪽 고정 열 360(넣기 → 비상시 → 저울 링크). 이정표 · 도달 · 넣지 않은 달은 한 패널 안 세 칸. 숫자는 전부 서버 응답, 프레임은 서버 `frame`
 */
export const GoalDetailView = ({ goalId, initial }: { goalId: string; initial: SavingsGoalDetail | null }) => {
  const query = useSavingsGoal(goalId, initial);
  if (query.isSignedOut) {
    return (
      <div className={s.stack}>
        <Back />
        <StatusLine kind="blocked">{M.signedOut}</StatusLine>
      </div>
    );
  }
  if (query.isError && !query.data) {
    return (
      <div className={s.stack}>
        <Back />
        <StatusLine kind="error">{hasApiStatus(query.error, 404) ? M.notFound : GOAL_MESSAGES.loadFailed}</StatusLine>
      </div>
    );
  }
  if (!query.data) return <Skeleton height={480} />;

  const { goal, plan, deposits, missedMonths, units, unitLimit, todayMoney } = query.data;
  const lead =
    goal.frame === "saved"
      ? { label: GOAL_MESSAGES.saved, value: formatWon(goal.saved), sub: `${GOAL_MESSAGES.remaining} ${formatWon(goal.remaining)}` }
      : { label: GOAL_MESSAGES.remaining, value: formatWon(goal.remaining), sub: `${GOAL_MESSAGES.saved} ${formatWon(goal.saved)}` };
  const active = goal.status === "active";

  const progress = (
    <>
      <Panel title={M.planTitle}>
        <div className={s.planRow}>
          <GoalScene scene={goal.scene} />
          <div className={s.planText}>
            {plan.state === "ok" ? (
              <span className={s.kv}>
                <span className={s.muted}>{goal.targetDate ? M.planMonthly : M.planReach}</span>
                <span className={s.value}>
                  {goal.targetDate
                    ? plan.monthly !== null
                      ? formatWon(plan.monthly)
                      : "—"
                    : plan.reachMonth
                      ? GOAL_MESSAGES.projection.plan(plan.reachMonth)
                      : "—"}
                </span>
              </span>
            ) : (
              <span className={s.muted}>{labelOr(GOAL_MESSAGES.calculationState, plan.state, "")}</span>
            )}
            {goal.planMeetsDeadline === false && goal.targetDate ? (
              <span className={s.muted}>{GOAL_MESSAGES.deadlineMissed(goal.targetDate.slice(0, 7))}</span>
            ) : null}
            {goal.unitLine ? <span className={s.muted}>{GOAL_MESSAGES.unitLine(goal.unitLine.name, goal.unitLine.count)}</span> : null}
          </div>
        </div>
      </Panel>
      <Panel title={M.statusTitle}>
        <div className={s.cells}>
          <MilestoneBox milestone={goal.milestone} />
          <ProjectionLine projection={goal.projection} />
          <MissedMonthsBox missed={missedMonths} />
        </div>
      </Panel>
      <Panel title={ITEM_UNIT_MESSAGES.title}>
        <div className={s.formWidth}>
          <ItemUnitEditor goalId={goal.id} units={units} limit={unitLimit} compact />
        </div>
      </Panel>
    </>
  );

  const history = (
    <>
      <Panel title={GOAL_MESSAGES.stamps.title}>
        <StampBoard count={goal.stampCount} bare />
      </Panel>
      <Panel title={M.deposits}>
        {deposits.length === 0 ? (
          <p className={s.muted}>{M.noDeposits}</p>
        ) : (
          <ul className={s.deposits}>
            {deposits.map((d) => {
              const note = depositNote(d);
              return (
                <li key={d.id} className={s.depositRow}>
                  <span className={s.depositMain}>
                    <span className={s.value}>{d.depositedOn}</span>
                    {note ? <span className={s.muted}>{note}</span> : null}
                  </span>
                  <span className={s.value}>{formatWon(d.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );

  const review = (
    <>
      <Panel title={GOAL_MESSAGES.todayMoney.title}>
        <TodayMoneyBox money={todayMoney} targetAmount={goal.targetAmount} bare />
      </Panel>
      {goal.postcard ? (
        <Panel title={GOAL_MESSAGES.postcard.title}>
          <PostcardList goals={[goal]} titled={false} />
        </Panel>
      ) : null}
    </>
  );

  const aside = (
    <div className={s.aside}>
      {active ? (
        <section className={s.asideBlock} aria-label={M.aside}>
          <h2 className={detailPanelTitle}>{M.aside}</h2>
          <DepositForm goalId={goal.id} compact />
        </section>
      ) : (
        <p className={s.muted}>{GOAL_MESSAGES.completed}</p>
      )}
      {goal.saved > 0 ? (
        <section className={s.asideBlock} aria-label={EMERGENCY_MESSAGES.title}>
          <h2 className={detailPanelTitle}>{EMERGENCY_MESSAGES.title}</h2>
          <EmergencyCompare goalId={goal.id} compact />
        </section>
      ) : null}
      <SideRow href={ROUTES.goals} icon={null} label={M.balance} hint={M.balanceHint} />
    </div>
  );

  return (
    <div className={s.stack}>
      <Back title={goal.title} />
      <header className={s.head}>
        <h1 className={s.name}>
          {goal.title} {templateTag(goal) ? <span className={s.chip}>{templateTag(goal)}</span> : null}
        </h1>
        <div className={s.headLine}>
          <span className={s.muted}>{lead.label}</span>
          <strong className={s.leadValue}>{lead.value}</strong>
          <span className={s.muted}>
            {goal.status === "completed" ? GOAL_MESSAGES.completed : `${goal.progressPercent}% · ${lead.sub}`} · {GOAL_MESSAGES.target}{" "}
            {formatWon(goal.targetAmount)} · {GOAL_MESSAGES.depositCount(goal.depositCount)}
          </span>
        </div>
      </header>
      <DetailTabs
        label={M.tabsLabel}
        tabs={[
          { id: "progress", label: M.tabs.progress, content: progress },
          { id: "history", label: M.tabs.history, content: history },
          { id: "review", label: M.tabs.review, content: review },
        ]}
        aside={{ id: "deposit", label: M.aside, content: aside }}
      />
    </div>
  );
};
