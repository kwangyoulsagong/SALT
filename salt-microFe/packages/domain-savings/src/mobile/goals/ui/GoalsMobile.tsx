"use client";

import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

import { MOBILE_PATHS, MOBILE_ROUTES } from "@repo/core/mobile";
import { ROUTES } from "@repo/web-shared/config";
import { DesktopViewLink, MobileOfflineFallback, MobileOfflineSave, MobileSection, MobileSummary } from "@repo/web-shared/layout/mobile";

import {
  GOAL_MESSAGES,
  GOAL_SUMMARY_FAILED,
  GOAL_SUMMARY_MESSAGES,
  GoalRow,
  goalRows,
  goalSummaryItems,
  useSavingsGoals,
  useSavingsOverview,
  type SavingsGoal,
  type SavingsOverview,
} from "@/entities/goal";
import { GOAL_TOOLS_MESSAGES, GoalTools } from "@/widgets/goal-tools";

import { GOALS_MOBILE as M } from "../model/messages";
import { goalsOfflineSnapshot } from "../model/offline";
import * as s from "./goalsMobile.css";

/** 요약 금액 카드 높이(390 실측 214 — 금액 행 + 바닥 줄 셋) — 뼈대가 실제 카드와 같아야 카드가 올 때 아래가 밀리지 않는다 */
const SUMMARY_SKELETON = 214;

/**
 * 휴대폰 저축 목록 본문(`FE-REQ-072` FR-2 ← `FE-REQ-060` FR-M2) — 요약(모은 돈 30 + 줄) → 목표 행(누르면 상세로 push) → 저축 도구(접힘, 기본 크기).
 * 데스크톱 `GoalsBoard` 와 같은 조회 · 같은 칸(`goalSummaryItems`) — 배치만 다르다. 숫자는 전부 서버 값
 */
export const GoalsMobile = ({ initialGoals, initialOverview }: { initialGoals: SavingsGoal[] | null; initialOverview: SavingsOverview | null }) => {
  const goals = useSavingsGoals(initialGoals);
  const overview = useSavingsOverview(initialOverview);
  const router = useRouter();
  const open = useCallback((id: string) => router.push(MOBILE_ROUTES.goal(id)), [router]);

  if (goals.isSignedOut) {
    return (
      <div className={s.status}>
        <StatusLine kind="blocked">{M.signedOut}</StatusLine>
        <Link href={MOBILE_PATHS.login} className={s.textLink}>
          {M.signIn}
        </Link>
      </div>
    );
  }
  // 받기 실패 · 끊겨 멈춘 조회 — 이 기기의 한 벌이 있으면 그것(`FE-REQ-073` FR-2), 없으면 원래 실패 · 뼈대
  if (goals.isError && !goals.data) {
    return (
      <MobileOfflineFallback screen="goals">
        <div className={s.status}>
          <StatusLine kind="error">{GOAL_MESSAGES.loadFailed}</StatusLine>
          <Button size="md" variant="weak" onClick={() => void goals.refetch()}>
            {M.retry}
          </Button>
        </div>
      </MobileOfflineFallback>
    );
  }
  if (!goals.data) {
    return goals.fetchStatus === "paused" ? (
      <MobileOfflineFallback screen="goals">
        <Skeleton height={480} />
      </MobileOfflineFallback>
    ) : (
      <Skeleton height={480} />
    );
  }
  const list = goals.data;
  if (list.length === 0) {
    return (
      <div className={s.status}>
        <p className={s.note}>{M.empty}</p>
        <DesktopViewLink to={ROUTES.addGoal} />
      </div>
    );
  }

  // 요약 실패면 주인공을 뺀다 — "불러오지 못했어요"를 30 큰 숫자로 보이지 않는다(`FE-REQ-060` FR-13)
  const summary = overview.data ? goalSummaryItems(overview.data) : overview.isError ? GOAL_SUMMARY_FAILED.map((item) => ({ ...item, hero: false })) : null;

  return (
    <>
      <MobileOfflineSave snapshot={goalsOfflineSnapshot(list, overview.data ?? null)} />
      {summary ? <MobileSummary items={summary} label={GOAL_SUMMARY_MESSAGES.label} icon="ranking" /> : <Skeleton height={SUMMARY_SKELETON} />}
      <MobileSection title={M.list}>
        <ul className={goalRows}>
          {list.map((goal) => (
            <GoalRow key={goal.id} goal={goal} selected={false} onSelect={open} />
          ))}
        </ul>
      </MobileSection>
      <MobileSection title={GOAL_TOOLS_MESSAGES.label}>
        <div className={s.tools}>
          {/* 휴대폰 — 데스크톱 조밀 입력(32 · 12) 대신 기본 크기(터치 44 · 글자 13 이상, `FE-REQ-072` FR-5) */}
          <GoalTools goals={list} compact={false} />
        </div>
      </MobileSection>
    </>
  );
};
