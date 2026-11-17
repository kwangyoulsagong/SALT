"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { RISK_MESSAGES, riskSummaryLine, useJudgmentScoreboard, useRiskBudget } from "@/entities/coach";
import { useHasSession } from "@repo/web-shared/api";
import { COACH_REPORT_SECTIONS, ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { JUDGMENT_OVERVIEW_MESSAGES } from "../model";
import { cell, cellBody, cellLabel, cellNote, cellValue, cellValueAlert, strip, stripPending } from "./JudgmentOverview.css";

const M = JUDGMENT_OVERVIEW_MESSAGES;

const Cell = ({ href, label, linkLabel, children }: { href: string; label: string; linkLabel: string; children: ReactNode }) => (
  <Link href={href} className={cell} aria-label={linkLabel}>
    <span className={cellBody}>
      <span className={cellLabel}>{label}</span>
      {children}
    </span>
    <NavChevron />
  </Link>
);

const Line = ({ value, note, strong = false }: { value: string; note?: string | null; strong?: boolean }) => (
  <>
    <span className={strong ? `${cellValue} ${cellValueAlert}` : cellValue}>{value}</span>
    {note && <span className={cellNote}>{note}</span>}
  </>
);

const KR_STOCK = "kr_stock";

/**
 * 위험 칸 — 손실 예산 · 가장 큰 비중은 **보유 전체**(코인 + 국내, 서버 `RISK_ASSET_TYPES`)라 두 탭에 같다. BTC 동조는 코인
 * 숫자라 국내 탭에서 뺀다
 */
const RiskCell = ({ withBeta }: { withBeta: boolean }) => {
  const budget = useRiskBudget();
  const d = budget.data;
  const R = M.risk;
  const line = () => {
    if (budget.isPending) return <Line value={" "} />;
    if (budget.isError || !d || d.status === "unavailable") return <Line value={R.unavailable} />;
    // 리포트 패널과 같은 한 줄(`riskSummaryLine`) — 넘을 때만 강조
    const summary = riskSummaryLine(d, withBeta);
    return (
      <Line
        value={summary.value}
        note={summary.notes.length ? summary.notes.join(" · ") : RISK_MESSAGES.summary.noteFallback}
        strong={summary.exceeded}
      />
    );
  };
  return (
    <Cell href={ROUTES.coachReportSection(COACH_REPORT_SECTIONS.riskBudget)} label={R.label} linkLabel={R.linkLabel}>
      {line()}
    </Cell>
  );
};

const ScoreboardCell = ({ assetClass }: { assetClass: string }) => {
  const board = useJudgmentScoreboard();
  const d = board.data;
  const S = M.scoreboard;
  const line = () => {
    if (board.isPending) return <Line value={" "} />;
    if (board.isError || !d || d.status === "unavailable") return <Line value={S.unavailable} />;
    // 탭의 자산군 판정만 센다 — 코인 · 국내 표본을 더하면 어느 쪽 성적도 아닌 숫자가 된다(F011 FR-65 · `FE-REQ-050` FR-5)
    const groups = d.groups.filter((group) => (group.assetClass ?? "crypto") === assetClass);
    const sample = groups.reduce((sum, group) => sum + group.sample, 0);
    // 적중률은 여기 없다 — 기준 대비 · 표본 없이 한 숫자만 보이면 오해를 산다(`modeling-evaluation.md` §4)
    if (d.status === "insufficient_data" || sample === 0) return <Line value={S.empty} note={S.note} />;
    return <Line value={S.scored(sample, groups.length)} note={S.note} />;
  };
  return (
    <Cell href={ROUTES.coachReportSection(COACH_REPORT_SECTIONS.scoreboard)} label={S.label} linkLabel={S.linkLabel}>
      {line()}
    </Cell>
  );
};

/**
 * `/investments` 머리 아래 **요약 띠** — [위험에 노출된 돈] [판정 성적표] (F010 · `FE-REQ-040` FR-13 ·
 * `FE-REQ-042` FR-13). 칸마다 한 줄 값 + 한 줄 설명, 누르면 코치 리포트의 그 섹션으로 간다.
 *
 * 2026-09-29 까지는 세 카드 본문 전체가 여기 있었다 — 목표 비중 카드 하나가 876px(뷰포트 772)이라 시세 표가 1890px 에서
 * 시작했다. 투자 화면의 본업은 시세다. 본문은 `/coach/report` 로 옮겼고 여기는 진입점만 남는다.
 *
 * ~~목표 비중 칸~~ 2026-11-17 뺐다 — 목표 비중 패널은 쓰는 흐름이 없다(F017 v4 순서 6 · `FE-REQ-064` FR-12, 계산은 서버에 남는다).
 * 위험 칸은 넘을 때만 강조(진한 경고색 글자 — 막지 않는다). 두 조회는 리포트와 같은 query key 라 리포트로 넘어가도 다시 부르지 않는다. 로그인 여부는 수화 뒤에 본다.
 *
 * 국내 탭(`FE-REQ-050` FR-5): 위험은 보유 전체(BTC 동조 줄 뺌) · 성적표는 `kr_stock` 그룹만.
 */
export const JudgmentOverview = ({ assetClass = "crypto" }: { assetClass?: string }) => {
  const signedIn = useHasSession();
  if (signedIn === null) return <div className={stripPending} aria-hidden="true" />;
  if (!signedIn) return null;
  const isKr = assetClass === KR_STOCK;
  return (
    <nav className={strip} aria-label={isKr ? M.krRegionLabel : M.regionLabel}>
      {/* ~~목표 비중 칸~~ 지웠다 — 목표 비중 패널은 쓰는 흐름이 없어 화면에서 뺐다(F017 v4 순서 6 · `FE-REQ-064` FR-12, 계산은 서버에 남는다) */}
      <RiskCell withBeta={!isKr} />
      <ScoreboardCell assetClass={isKr ? KR_STOCK : "crypto"} />
    </nav>
  );
};
