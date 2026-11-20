"use client";

// 클라이언트 잎: 주간 계획 · 설정 · 월 합계를 브라우저에서 읽고(포지션 위젯과 같은 이유 — 토큰은 쿠키), 체크 · 저장이 여기서 일어난다.
import { Button } from "@repo/ui/button";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { CompleteWeeklyPlanForm } from "@/features/complete-weekly-plan";
import { PlanSettingsForm } from "@/features/edit-plan-settings";
import {
  KimchiNote,
  MonthlySummaryView,
  PLAN_MESSAGES as M,
  PlanAssetCard,
  PlanTotal,
  StreakLine,
  useMonthlyPlanSummary,
  usePlanSettings,
  useWeeklyPlan,
} from "@/entities/plan";

import {
  emptyBody,
  emptyGrid,
  emptyMain,
  emptyTitle,
  sample,
  sampleBadge,
  sampleBar,
  sampleHead,
  sampleHero,
  sampleName,
  sampleRow,
  stack,
  twoColumns,
} from "./WeeklyPlanBoard.css";

/**
 * 밴드 적립 본문(`/plan`, F003 v2 순서 3) — 큰 숫자 → 자산별 근거 · 성적 · 빗나간 때 → 김프 · 이번 달 · 월 적립액.
 * 블록마다 따로 부른다 — 월 합계 · 설정이 실패해도 이번 주 금액은 그대로(`FE-REQ-022` FR-84). 조합만 한다(계산 0)
 */
export const WeeklyPlanBoard = () => {
  const weekly = useWeeklyPlan();
  const configured = weekly.isSuccess && weekly.data.configured;
  const settings = usePlanSettings(weekly.isSuccess);
  const monthly = useMonthlyPlanSummary(configured);

  if (weekly.isSignedOut) return null; // 페이지가 유리막을 그린다
  if (weekly.isPending) {
    return (
      <section className={panel} aria-busy="true">
        <Text color="tertiary">{M.loading}</Text>
      </section>
    );
  }
  if (weekly.isError) {
    return (
      <section className={panel}>
        <StatusLine kind="error">{M.loadFailed}</StatusLine>
        <div>
          <Button size="sm" variant="weak" onClick={() => weekly.refetch()}>
            {M.retry}
          </Button>
        </div>
      </section>
    );
  }

  const plan = weekly.data;
  const settingsForm = settings.isSuccess ? <PlanSettingsForm settings={settings.data} /> : null;

  // 설정 전 — 안내와 입력을 한 칸에, 오른쪽은 정한 뒤 모양 예시(2026-11-20 — 가운데 안내와 왼쪽 아래 입력이 떨어져 있었다)
  if (!plan.configured) {
    return (
      <section className={`${panel} ${emptyGrid}`} aria-labelledby="plan-empty">
        <div className={emptyMain}>
          <h2 id="plan-empty" className={emptyTitle}>
            {M.notConfiguredTitle}
          </h2>
          <p className={emptyBody}>{M.notConfiguredBody}</p>
          {settingsForm}
        </div>
        <div className={sample} aria-hidden="true">
          <div className={sampleHead}>
            <span className={emptyBody}>{M.sampleTitle}</span>
            <span className={sampleBadge}>{M.sample}</span>
          </div>
          <span className={sampleHero} />
          {M.sampleRows.map((row, index) => (
            <div key={row} className={sampleRow}>
              <span className={sampleName}>{row}</span>
              <span className={sampleBar} style={{ width: `${[72, 54, 38][index]}%` }} />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // 칸 처음 값(계획액)이 바뀌면 체크 폼을 다시 세운다 — 체크 상태(낙관적)는 key 에 넣지 않는다
  const formKey = `${plan.weekOf}:${plan.items.map((i) => `${i.asset}=${i.amountKrw}`).join(",")}`;

  return (
    <div className={stack}>
      <section className={panel} aria-labelledby="plan-total">
        <div className={panelHead}>
          <h2 id="plan-total" className={panelTitle}>
            {M.heading}
          </h2>
        </div>
        <PlanTotal plan={plan} />
        <StreakLine streak={plan.streak} />
        <CompleteWeeklyPlanForm key={formKey} plan={plan} />
      </section>
      {plan.items.map((item) => (
        <section key={item.asset} className={panel} aria-labelledby={`plan-asset-${item.asset}`}>
          <PlanAssetCard item={item} headingId={`plan-asset-${item.asset}`} />
        </section>
      ))}
      <div className={twoColumns}>
        <section className={panel}>
          {monthly.isSuccess ? <MonthlySummaryView summary={monthly.data} /> : null}
          {monthly.isError ? <StatusLine kind="error">{M.monthly.loadFailed}</StatusLine> : null}
          <KimchiNote kimchi={plan.kimchiPremium} />
        </section>
        <section className={panel}>{settingsForm}</section>
      </div>
    </div>
  );
};
