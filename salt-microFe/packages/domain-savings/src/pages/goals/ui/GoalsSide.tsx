"use client";

import { GOAL_MESSAGES, PostcardList, useSavingsGoals, type SavingsGoal } from "@/entities/goal";
import { BalanceScale, REBALANCE_MESSAGES } from "@/features/rebalance-goals";
import { SplitDepositForm } from "@/features/record-deposit";

import { GOALS_PAGE as M } from "../model";
import * as s from "./goals.css";

/** 나눠 넣기는 진행 중 목표가 둘 이상일 때만 의미가 있다 */
const SPLIT_MIN_GOALS = 2;

/**
 * 저축 도구(`FE-REQ-060` FR-8) — 나눠 넣기 · 목표 저울 · 엽서 보관함(접힘). 데스크톱은 오른쪽 사이드, 앱 웹뷰는 본문 아래(`GoalsBoard`).
 * 숫자 · 구간은 전부 서버 응답
 */
export const GoalsTools = ({ goals, compact = true }: { goals: SavingsGoal[]; compact?: boolean }) => {
  const active = goals.filter((g) => g.status === "active");
  const postcards = goals.filter((g) => g.postcard !== null).length;
  // 도구는 접어 둔다(2026-11-20 — 입력칸 7개가 펼쳐진 오른쪽 칸이 어지러웠다, 리서치: 덜 쓰는 도구는 접는다). 펼치면 전과 같은 폼
  return (
    <>
      <details className={s.fold}>
        <summary className={s.foldSummary}>
          <span>{M.split}</span>
        </summary>
        {active.length >= SPLIT_MIN_GOALS ? <SplitDepositForm goals={active} compact={compact} /> : <p className={s.hint}>{M.splitHint}</p>}
      </details>
      {active.length > 0 ? (
        <details className={s.fold}>
          <summary className={s.foldSummary}>
            <span>{REBALANCE_MESSAGES.title}</span>
          </summary>
          <p className={s.hint}>{REBALANCE_MESSAGES.description}</p>
          {/* 진행 중 목표 구성이 바뀌면(새 목표 · 다 참) 입력 칸을 새로. 계획 금액은 키에 넣지 않는다 — 확정 응답으로 다시 마운트되면 "바꿨어요" 상태가 사라진다(실측 2026-11-03) */}
          <BalanceScale key={active.map((g) => g.id).join("|")} goals={active} compact={compact} />
        </details>
      ) : null}
      <details className={s.fold}>
        <summary className={s.foldSummary}>
          <span>{GOAL_MESSAGES.postcard.title}</span>
          <span className={s.hint}>{M.postcardsCount(postcards)}</span>
        </summary>
        <PostcardList goals={goals} titled={false} />
      </details>
    </>
  );
};

/** 오른쪽 사이드 — 본문과 같은 목록 조회 키라 요청은 한 번. 목록이 없으면 비운다(빈 사이드는 PageFrame 이 접는다) */
export const GoalsSide = ({ initialGoals }: { initialGoals: SavingsGoal[] | null }) => {
  const goals = useSavingsGoals(initialGoals);
  if (!goals.data || goals.data.length === 0) return null;
  return <GoalsTools goals={goals.data} />;
};
