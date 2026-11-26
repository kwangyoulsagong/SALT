"use client";

import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { ServiceIcon } from "@repo/ui/serviceicon";
import { SummaryBand, type SummaryBandItem } from "@repo/ui/summaryBand";
import { useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { TimelyTip, TimelyTipContext } from "@repo/web-shared/ui";

import {
  GOAL_MESSAGES,
  GOAL_SUMMARY_FAILED,
  GOAL_SUMMARY_MESSAGES,
  GOAL_BOARD_MESSAGES,
  GoalPlanBars,
  GoalReachTimeline,
  GoalRow,
  goalRows,
  goalSummaryItems,
  resolveSelectedGoal,
  useSavingsGoals,
  useSavingsOverview,
  type SavingsGoal,
  type SavingsOverview,
} from "@/entities/goal";

import { GOALS_PAGE as M } from "../model";
import { GoalPreview } from "./GoalPreview";
import { GoalsStart } from "./GoalsStart";
import * as s from "./goals.css";

/** 고른 목표가 사는 주소 — `?goal=`(목록 + 미리보기 패턴: 선택은 주소에, `screen-desktop.md` §4) */
const GOAL_PARAM = "goal";

/** 요약 띠(`FE-REQ-060` FR-2) — 칸 · 값은 `goalSummaryItems`(서버 `overview` 그대로, 휴대폰 요약과 한 벌). 실패면 그 칸만 한 줄(FR-13) */
const Band = ({ overview }: { overview: ReturnType<typeof useSavingsOverview> }) => {
  const items: SummaryBandItem[] | null = overview.data ? goalSummaryItems(overview.data) : overview.isError ? GOAL_SUMMARY_FAILED : null;
  // 금액 카드 — 휴대폰 저축 요약과 같은 3D 아이콘(`FE-REQ-076` FR-4)
  if (items) return <SummaryBand items={items} label={GOAL_SUMMARY_MESSAGES.label} icon={<ServiceIcon variant="ranking" />} />;
  // 금액 카드와 같은 높이 — 1280 이상 한 줄 · 아래 폭은 타일이 금액 아래로 접힌다(2회차 실측 112 · 190, 도착할 때 아래가 밀리지 않게)
  return (
    <div className={s.summarySkeleton}>
      <Skeleton height="100%" radius="medium" />
    </div>
  );
};

/**
 * 목표 목록 본문(`FE-REQ-060` FR-2 · FR-8 · FR-13) — 요약 띠 → 목표 목록(행 56) | 미리보기(고른 목표 · `?goal=`). 나눠 넣기 · 저울 · 엽서는 오른쪽 사이드.
 * 휴대폰 배치는 여기 없다 — `/m/goals`(`mobile/goals`, `FE-REQ-072`).
 * 숫자는 전부 서버 값. 첫 숫자는 서버가 쿠키로 받아 넘긴다 — 없으면 브라우저가 부른다
 */
export const GoalsBoard = ({ initialGoals, initialOverview }: { initialGoals: SavingsGoal[] | null; initialOverview: SavingsOverview | null }) => {
  const goals = useSavingsGoals(initialGoals);
  const overview = useSavingsOverview(initialOverview);
  const params = useSearchParams();
  // 같은 패널 오른쪽 미리보기 — 선택은 주소에(휴대폰은 `/m/goals` 가 상세로 push, `FE-REQ-072`)
  const selectGoal = useCallback((id: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(GOAL_PARAM, id);
    window.history.replaceState(null, "", url);
  }, []);

  // 상태는 패널 안 한 줄(FR-13) — 큰 빈 그림 · 빈 카드 0. 실패는 다시 불러오기 하나
  if (goals.isSignedOut) return <StatusLine kind="blocked">{M.signedOut}</StatusLine>;
  if (goals.isError && !goals.data) {
    return (
      <div className={s.statusRow}>
        <StatusLine kind="error">{GOAL_MESSAGES.loadFailed}</StatusLine>
        <Button size="desk" variant="weak" onClick={() => void goals.refetch()}>
          {M.retry}
        </Button>
      </div>
    );
  }
  if (!goals.data) return <Skeleton height={480} />;
  const list = goals.data;

  // 목표가 없으면 템플릿 고르기(2026-11-20 — 한 줄 빈 상태가 넓은 패널에서 텅 비어 보였다)
  if (list.length === 0) return <GoalsStart />;

  const selectedId = resolveSelectedGoal(params?.get(GOAL_PARAM) ?? null, list);
  const selected = list.find((g) => g.id === selectedId) ?? null;
  // 진행 중 목표만 견준다(다 찬 · 쉬는 목표는 계획 · 도달이 없다) — 없으면 전부
  const activeOnly = list.filter((g) => g.status === "active");
  const active = activeOnly.length > 0 ? activeOnly : list;

  return (
    <div className={s.board}>
      <Band overview={overview} />
      <p className={s.description}>{M.description}</p>
      {/* 때맞춘 팁 0~1장 — 결혼 · 주거 목표를 만들면 붙는 제도 한 줄(FE-REQ-058 FR-6). 무엇을 띄울지는 서버 */}
      <TimelyTip context={TimelyTipContext.Savings} />
      <div className={s.split}>
        {/* 왼쪽 칸 — 목록 → 이번 달 계획 대비 → 도달 예상(2026-11-26 — 목록 아래가 통째로 비어 있었다). 값은 서버 이정표 · 구간 그대로 */}
        <div className={s.column}>
          <section className={s.section} aria-labelledby="goals-list">
            <div className={s.sectionHead}>
              <h2 id="goals-list" className={s.sectionTitle}>
                {M.list}
              </h2>
            </div>
            <ul className={goalRows}>
              {list.map((goal) => (
                <GoalRow key={goal.id} goal={goal} selected={goal.id === selectedId} onSelect={selectGoal} />
              ))}
            </ul>
          </section>
          <section className={s.section} aria-labelledby="goals-plan">
            <div className={s.sectionHead}>
              <h2 id="goals-plan" className={s.sectionTitle}>
                {GOAL_BOARD_MESSAGES.planTitle}
              </h2>
              <span className={s.hint}>{GOAL_BOARD_MESSAGES.planCaption(list[0]!.milestone.month)}</span>
            </div>
            <GoalPlanBars goals={active} />
          </section>
          <section className={s.section} aria-labelledby="goals-reach">
            <div className={s.sectionHead}>
              <h2 id="goals-reach" className={s.sectionTitle}>
                {GOAL_BOARD_MESSAGES.reachTitle}
              </h2>
            </div>
            <GoalReachTimeline goals={active} currentMonth={list[0]!.milestone.month} />
          </section>
        </div>
        <section className={s.section} aria-labelledby="goals-preview">
          <div className={s.sectionHead}>
            <h2 id="goals-preview" className={s.sectionTitle}>
              {M.preview}
            </h2>
          </div>
          {selected ? <GoalPreview key={selected.id} goal={selected} /> : <p className={s.hint}>{M.previewEmpty}</p>}
        </section>
      </div>
    </div>
  );
};
