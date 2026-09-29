"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import {
  formatRatio,
  TargetWeightSummary,
  useJudgmentScoreboard,
  useRiskBudget,
  useTargetWeights,
} from "@/entities/coach";
import { useHasAccessToken } from "@/shared/api";
import { COACH_REPORT_SECTIONS, ROUTES } from "@/shared/config";
import { NavChevron } from "@/shared/ui";

import { JUDGMENT_OVERVIEW_MESSAGES } from "../model";
import { cell, cellBody, cellLabel, cellNote, cellValue, strip, stripPending } from "./JudgmentOverview.css";

const M = JUDGMENT_OVERVIEW_MESSAGES;
const betaFormatter = new Intl.NumberFormat("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });

const Cell = ({ href, label, linkLabel, children }: { href: string; label: string; linkLabel: string; children: ReactNode }) => (
  <Link href={href} className={cell} aria-label={linkLabel}>
    <span className={cellBody}>
      <span className={cellLabel}>{label}</span>
      {children}
    </span>
    <NavChevron />
  </Link>
);

const Line = ({ value, note }: { value: string; note?: string | null }) => (
  <>
    <span className={cellValue}>{value}</span>
    {note && <span className={cellNote}>{note}</span>}
  </>
);

const TargetWeightCell = () => {
  const weights = useTargetWeights();
  const d = weights.data;
  const content = weights.isPending ? (
    <Line value={" "} />
  ) : weights.isError || !d || d.status === "unavailable" ? (
    <Line value={M.targetWeight.unavailable} />
  ) : d.status === "blocked" ? (
    <Line value={M.targetWeight.blocked} />
  ) : (
    <TargetWeightSummary view={d} valueClassName={cellValue} noteClassName={cellNote} />
  );
  return (
    <Cell
      href={ROUTES.coachReportSection(COACH_REPORT_SECTIONS.targetWeight)}
      label={M.targetWeight.label}
      linkLabel={M.targetWeight.linkLabel}
    >
      {content}
    </Cell>
  );
};

const RiskCell = () => {
  const budget = useRiskBudget();
  const d = budget.data;
  const R = M.risk;
  const line = () => {
    if (budget.isPending) return <Line value={" "} />;
    if (budget.isError || !d || d.status === "unavailable") return <Line value={R.unavailable} />;
    const { drawdown, concentration, btcBeta } = d.gauges;
    const value =
      drawdown.status === "budget_not_set"
        ? R.budgetNotSet
        : drawdown.status === "insufficient_data" || drawdown.usedRate === null
          ? R.insufficient
          : drawdown.status === "exceeded"
            ? R.drawdownExceeded(formatRatio(drawdown.usedRate))
            : R.drawdownUsed(formatRatio(drawdown.usedRate));
    const notes = [
      concentration.topSymbol && concentration.topWeight !== null
        ? R.top(concentration.topSymbol, formatRatio(concentration.topWeight))
        : null,
      btcBeta.betaSum !== null ? R.beta(betaFormatter.format(btcBeta.betaSum)) : null,
    ].filter(Boolean);
    return <Line value={value} note={notes.length ? notes.join(" · ") : R.noteFallback} />;
  };
  return (
    <Cell href={ROUTES.coachReportSection(COACH_REPORT_SECTIONS.riskBudget)} label={R.label} linkLabel={R.linkLabel}>
      {line()}
    </Cell>
  );
};

const ScoreboardCell = () => {
  const board = useJudgmentScoreboard();
  const d = board.data;
  const S = M.scoreboard;
  const line = () => {
    if (board.isPending) return <Line value={" "} />;
    if (board.isError || !d || d.status === "unavailable") return <Line value={S.unavailable} />;
    const sample = d.groups.reduce((sum, group) => sum + group.sample, 0);
    // 적중률은 여기 없다 — 기준 대비 · 표본 없이 한 숫자만 보이면 오해를 산다(`modeling-evaluation.md` §4)
    if (d.status === "insufficient_data" || sample === 0) return <Line value={S.empty} note={S.note} />;
    return <Line value={S.scored(sample, d.groups.length)} note={S.note} />;
  };
  return (
    <Cell href={ROUTES.coachReportSection(COACH_REPORT_SECTIONS.scoreboard)} label={S.label} linkLabel={S.linkLabel}>
      {line()}
    </Cell>
  );
};

/**
 * `/investments` 머리 아래 **요약 띠** — [이번 주 목표 비중] [위험에 노출된 돈] [판정 성적표] (F010 · `FE-REQ-040` FR-13 ·
 * `FE-REQ-042` FR-13). 칸마다 한 줄 값 + 한 줄 설명, 누르면 코치 리포트의 그 섹션으로 간다.
 *
 * 2026-09-29 까지는 세 카드 본문 전체가 여기 있었다 — 목표 비중 카드 하나가 876px(뷰포트 772)이라 시세 표가 1890px 에서
 * 시작했다. 투자 화면의 본업은 시세다. 본문은 `/coach/report` 로 옮겼고 여기는 진입점만 남는다.
 *
 * 목표 비중 칸은 비중만 두지 않는다 — 고지 한 줄(근거 · 과거 성적 · 실패 사례)이 같이 있다(`TargetWeightSummary`).
 * 세 조회는 리포트와 같은 query key 라 리포트로 넘어가도 다시 부르지 않는다. 로그인 여부는 수화 뒤에 본다.
 */
export const JudgmentOverview = () => {
  const signedIn = useHasAccessToken();
  if (signedIn === null) return <div className={stripPending} aria-hidden="true" />;
  if (!signedIn) return null;
  return (
    <nav className={strip} aria-label={M.regionLabel}>
      <TargetWeightCell />
      <RiskCell />
      <ScoreboardCell />
    </nav>
  );
};
