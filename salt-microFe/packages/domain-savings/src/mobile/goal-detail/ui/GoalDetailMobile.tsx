"use client";

import type { ReactNode } from "react";

import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import Link from "next/link";

import { MOBILE_PATHS, MOBILE_ROUTES } from "@repo/core/mobile";
import { hasApiStatus } from "@repo/web-shared/api";
import { labelOr } from "@repo/web-shared/lib";
import { MobileHead, MobileSection, MobileSheetAction, MobileSummary } from "@repo/web-shared/layout/mobile";

import {
  formatWon,
  GOAL_MESSAGES,
  GoalScene,
  MilestoneBox,
  MissedMonthsBox,
  PostcardList,
  ProjectionLine,
  StampBoard,
  TodayMoneyBox,
  useSavingsGoal,
  type SavingsDeposit,
  type SavingsGoalDetail,
} from "@/entities/goal";
import { ItemUnitEditor, ITEM_UNIT_MESSAGES } from "@/features/add-item-unit";
import { EmergencyCompare, EMERGENCY_MESSAGES } from "@/features/compare-emergency";
import { DepositForm } from "@/features/record-deposit";

import { GOAL_DETAIL_MOBILE as M } from "../model/messages";
import * as s from "./goalDetailMobile.css";

const back = { href: MOBILE_ROUTES.goals, label: M.backTo };

const depositNote = (d: SavingsDeposit): string | null =>
  d.source === "imported_balance" ? M.importedBalance : d.source === "saved_by_challenge" ? M.savedByChallenge : d.note;

/** 덜 쓰는 칸은 접는다 — 섹션 행 48(`goal-tools` 와 같은 모양) */
const Fold = ({ title, children }: { title: string; children: ReactNode }) => (
  <details className={s.fold}>
    <summary className={s.foldSummary}>{title}</summary>
    {children}
  </details>
);

/**
 * 휴대폰 목표 상세(`FE-REQ-072` FR-2 ← `FE-REQ-060` FR-M2) — 뒤로 + 이름 → 주인공 숫자(모은 돈 · 남은 돈 30) + 진척 줄 → 계획 → 상태 셋 → 최근 적립 → 접힘(도장 · 오늘의 돈 · 엽서 · 실물 단위 · 비상시).
 * "넣기"는 하단 고정 버튼 → 시트(화면을 옮기지 않는다). 데스크톱 알약 탭 · 고정 열은 없다 — 한 열. 숫자 · 프레임은 전부 서버 값
 */
export const GoalDetailMobile = ({ goalId, initial }: { goalId: string; initial: SavingsGoalDetail | null }) => {
  const query = useSavingsGoal(goalId, initial);

  if (query.isSignedOut) {
    return (
      <>
        <MobileHead title={M.fallbackTitle} back={back} />
        <StatusLine kind="blocked">{M.signedOut}</StatusLine>
        <Link href={MOBILE_PATHS.login} className={s.textLink}>
          {M.signIn}
        </Link>
      </>
    );
  }
  if (query.isError && !query.data) {
    return (
      <>
        <MobileHead title={M.fallbackTitle} back={back} />
        <StatusLine kind="error">{hasApiStatus(query.error, 404) ? M.notFound : GOAL_MESSAGES.loadFailed}</StatusLine>
      </>
    );
  }
  if (!query.data) {
    return (
      <>
        <MobileHead title={M.fallbackTitle} back={back} />
        <Skeleton height={480} />
      </>
    );
  }

  const { goal, plan, deposits, missedMonths, units, unitLimit, todayMoney } = query.data;
  const savedFrame = goal.frame === "saved";
  const progressLine = goal.status === "completed" ? GOAL_MESSAGES.completed : `${goal.progressPercent}%`;
  const active = goal.status === "active";

  return (
    <>
      <MobileHead title={goal.title} back={back} />
      <MobileSummary
        label={goal.title}
        items={[
          {
            key: "lead",
            label: savedFrame ? GOAL_MESSAGES.saved : GOAL_MESSAGES.remaining,
            value: formatWon(savedFrame ? goal.saved : goal.remaining),
            hint: `${progressLine} · ${GOAL_MESSAGES.depositCount(goal.depositCount)}`,
            hero: true,
          },
          { key: "sub", label: savedFrame ? GOAL_MESSAGES.remaining : GOAL_MESSAGES.saved, value: formatWon(savedFrame ? goal.remaining : goal.saved) },
          { key: "target", label: GOAL_MESSAGES.target, value: formatWon(goal.targetAmount) },
        ]}
      />

      <MobileSection title={M.planTitle}>
        <div className={s.planRow}>
          <GoalScene scene={goal.scene} />
          <div className={s.planText}>
            {plan.state === "ok" ? (
              <>
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
              </>
            ) : (
              <span className={s.muted}>{labelOr(GOAL_MESSAGES.calculationState, plan.state, "")}</span>
            )}
            {goal.planMeetsDeadline === false && goal.targetDate ? (
              <span className={s.muted}>{GOAL_MESSAGES.deadlineMissed(goal.targetDate.slice(0, 7))}</span>
            ) : null}
            {goal.unitLine ? <span className={s.muted}>{GOAL_MESSAGES.unitLine(goal.unitLine.name, goal.unitLine.count)}</span> : null}
          </div>
        </div>
      </MobileSection>

      <MobileSection title={M.statusTitle}>
        <div className={s.cells}>
          <MilestoneBox milestone={goal.milestone} />
          <ProjectionLine projection={goal.projection} />
          <MissedMonthsBox missed={missedMonths} />
        </div>
      </MobileSection>

      <MobileSection title={M.deposits}>
        {deposits.length === 0 ? (
          <p className={s.muted}>{M.noDeposits}</p>
        ) : (
          <ul className={s.rows}>
            {deposits.map((d) => {
              const note = depositNote(d);
              return (
                <li key={d.id} className={s.row}>
                  <span className={s.rowMain}>
                    <span className={s.value}>{d.depositedOn}</span>
                    {note ? <span className={s.muted}>{note}</span> : null}
                  </span>
                  <span className={s.amount}>{formatWon(d.amount)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </MobileSection>

      <MobileSection title={M.more}>
        <div className={s.folds}>
          <Fold title={GOAL_MESSAGES.stamps.title}>
            <StampBoard count={goal.stampCount} bare />
          </Fold>
          <Fold title={GOAL_MESSAGES.todayMoney.title}>
            <TodayMoneyBox money={todayMoney} targetAmount={goal.targetAmount} bare />
          </Fold>
          {goal.postcard ? (
            <Fold title={GOAL_MESSAGES.postcard.title}>
              <PostcardList goals={[goal]} titled={false} />
            </Fold>
          ) : null}
          <Fold title={ITEM_UNIT_MESSAGES.title}>
            <ItemUnitEditor goalId={goal.id} units={units} limit={unitLimit} />
          </Fold>
          {goal.saved > 0 ? (
            <Fold title={EMERGENCY_MESSAGES.title}>
              <EmergencyCompare goalId={goal.id} />
            </Fold>
          ) : null}
        </div>
      </MobileSection>

      {active ? (
        <MobileSheetAction label={M.deposit} title={M.deposit}>
          <DepositForm goalId={goal.id} />
        </MobileSheetAction>
      ) : (
        <p className={s.muted}>{GOAL_MESSAGES.completed}</p>
      )}
    </>
  );
};
