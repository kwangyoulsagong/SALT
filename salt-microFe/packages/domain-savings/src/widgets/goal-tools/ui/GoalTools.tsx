"use client";

import { GOAL_MESSAGES, PostcardList, type SavingsGoal } from "@/entities/goal";
import { BalanceScale, REBALANCE_MESSAGES } from "@/features/rebalance-goals";
import { SplitDepositForm } from "@/features/record-deposit";

import { GOAL_TOOLS_MESSAGES as M } from "../model";
import * as s from "./goalTools.css";

/** 나눠 넣기는 진행 중 목표가 둘 이상일 때만 의미가 있다 */
const SPLIT_MIN_GOALS = 2;

/**
 * 저축 도구(`FE-REQ-060` FR-8) — 나눠 넣기 · 목표 저울 · 엽서 보관함(접힘). 데스크톱은 오른쪽 사이드(`pages/goals`), 휴대폰은 목록 아래(`mobile/goals`, `FE-REQ-072`).
 * 숫자 · 구간은 전부 서버 응답
 */
export const GoalTools = ({ goals, compact = true }: { goals: SavingsGoal[]; compact?: boolean }) => {
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

