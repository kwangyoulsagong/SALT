"use client";

import { Button } from "@repo/ui/button";
import { Skeleton } from "@repo/ui/skeleton";
import { StatusLine } from "@repo/ui/statusLine";
import { SummaryBand, type SummaryBandItem } from "@repo/ui/summaryBand";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { ROUTES } from "@repo/web-shared/config";
import { useInAppWebview } from "@repo/web-shared/lib";
import { AppSummary, TimelyTip, TimelyTipContext } from "@repo/web-shared/ui";
import { deskOnly } from "@repo/web-shared/ui/app.css";

import {
  formatWon,
  GOAL_MESSAGES,
  GoalRow,
  goalRows,
  reachText,
  resolveSelectedGoal,
  useSavingsGoals,
  useSavingsOverview,
  type SavingsGoal,
  type SavingsOverview,
} from "@/entities/goal";

import { GOALS_PAGE as M } from "../model";
import { GoalPreview } from "./GoalPreview";
import { GoalsTools } from "./GoalsSide";
import { GoalsStart } from "./GoalsStart";
import * as s from "./goals.css";

/** 고른 목표가 사는 주소 — `?goal=`(목록 + 미리보기 패턴: 선택은 주소에, `screen-desktop.md` §4) */
const GOAL_PARAM = "goal";

/** 요약 띠(`FE-REQ-060` FR-2) — 값은 서버 `overview` 그대로(합산 0). 주인공은 모은 돈 하나 */
const summaryItems = (o: SavingsOverview): SummaryBandItem[] => [
  { key: "saved", label: M.summary.saved, value: formatWon(o.totalSaved ?? 0), hint: M.summary.savedHint(o.totalGoals), hero: true },
  { key: "month", label: M.summary.month(o.month), value: formatWon(o.monthDeposited) },
  { key: "active", label: M.summary.active, value: M.summary.activeValue(o.activeGoals) },
  {
    key: "nearest",
    label: M.summary.nearest,
    value: o.nearestReach ? reachText(o.nearestReach.projection) : M.summary.none,
    hint: o.nearestReach?.title,
  },
];

/** 띠 실패 — 띠 자리를 지키고 그 칸만 한 줄(FR-13). 목록은 그대로 */
const failedItems: SummaryBandItem[] = [{ key: "saved", label: M.summary.saved, value: M.summary.failed, hero: true }];

const Band = ({ overview }: { overview: ReturnType<typeof useSavingsOverview> }) => {
  // 데스크톱 = 타일 띠, 앱 웹뷰 = 주인공 숫자 한 줄 + 아래 줄(같은 칸 · 같은 값, FR-M2)
  const items = overview.data ? summaryItems(overview.data) : overview.isError ? failedItems : null;
  if (items) {
    return (
      <>
        <SummaryBand items={items} label={M.summaryLabel} className={deskOnly} />
        <AppSummary items={items} label={M.summaryLabel} />
      </>
    );
  }
  return <Skeleton height={64} />;
};

/**
 * 목표 목록 본문(`FE-REQ-060` FR-2 · FR-8 · FR-13) — 요약 띠 → 목표 목록(행 56) | 미리보기(고른 목표 · `?goal=`). 나눠 넣기 · 저울 · 엽서는 오른쪽 사이드.
 * 숫자는 전부 서버 값. 첫 숫자는 서버가 쿠키로 받아 넘긴다 — 없으면 브라우저가 부른다
 */
export const GoalsBoard = ({ initialGoals, initialOverview }: { initialGoals: SavingsGoal[] | null; initialOverview: SavingsOverview | null }) => {
  const goals = useSavingsGoals(initialGoals);
  const overview = useSavingsOverview(initialOverview);
  const params = useSearchParams();
  const inApp = useInAppWebview();
  const router = useRouter();
  // 앱 웹뷰는 미리보기 칸이 없다 — 행을 누르면 상세로 push(뒤로 = 내비 바, FR-M2). 데스크톱은 같은 패널 오른쪽 미리보기
  const selectGoal = useCallback(
    (id: string) => {
      if (inApp) {
        router.push(ROUTES.goal(id));
        return;
      }
      const url = new URL(window.location.href);
      url.searchParams.set(GOAL_PARAM, id);
      window.history.replaceState(null, "", url);
    },
    [inApp, router],
  );

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

  return (
    <div className={s.board}>
      <Band overview={overview} />
      <p className={`${s.description} ${deskOnly}`}>{M.description}</p>
      {/* 때맞춘 팁 0~1장 — 결혼 · 주거 목표를 만들면 붙는 제도 한 줄(FE-REQ-058 FR-6). 무엇을 띄울지는 서버 */}
      <TimelyTip context={TimelyTipContext.Savings} />
      <div className={s.split}>
        <section className={s.section} aria-labelledby="goals-list">
          <div className={s.sectionHead}>
            <h2 id="goals-list" className={s.sectionTitle}>
              {M.list}
            </h2>
          </div>
          <ul className={goalRows}>
            {list.map((goal) => (
              <GoalRow key={goal.id} goal={goal} selected={!inApp && goal.id === selectedId} onSelect={selectGoal} />
            ))}
          </ul>
        </section>
        <section className={`${s.section} ${deskOnly}`} aria-labelledby="goals-preview">
          <div className={s.sectionHead}>
            <h2 id="goals-preview" className={s.sectionTitle}>
              {M.preview}
            </h2>
          </div>
          {selected ? <GoalPreview key={selected.id} goal={selected} /> : <p className={s.hint}>{M.previewEmpty}</p>}
        </section>
      </div>
      {/* 앱 웹뷰는 사이드가 숨는다(PageFrame) — 같은 도구를 목록 아래 섹션 행(셰브론 · 접힘)으로(FR-M2) */}
      {inApp ? (
        <div className={s.inlineTools}>
          {/* 앱 웹뷰 — 데스크톱 조밀 입력(32 · 12) 대신 기본 크기(터치 44 · 글자 13 이상, FR-M5) */}
          <GoalsTools goals={list} compact={false} />
        </div>
      ) : null}
    </div>
  );
};
