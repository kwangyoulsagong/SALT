import type { ReturnDistribution, ScoreboardCase, ScoreboardGroup } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import type { ReactNode } from "react";

import { formatRatio, formatShortDate, formatSignedPoints, formatSignedRate } from "../lib";
import { SCOREBOARD_MESSAGES, SIGNAL_EVIDENCE_MESSAGES } from "../model";
import { srOnly } from "./CoachBlock.css";
import { CaseIdentity } from "./CaseIdentity";
import { PerformanceClaimLine } from "./PerformanceClaimLine";
import * as s from "./SignalEvidence.css";
import { gauge, gaugeLabel, gaugeStatus, hint } from "./TradeRisk.css";

const M = SIGNAL_EVIDENCE_MESSAGES;

/** 그룹 키의 이름 — 국내 주식 키는 `kr_stock.` 접두를 떼고 같은 이름(성적표와 같은 규칙). 매핑 없으면 `undefined` */
export const signalTypeLabel = (signalType: string): string | undefined =>
  SCOREBOARD_MESSAGES.signalTypes[signalType.replace(/^kr_stock\./, "")];

/**
 * 성적 4칸 — 채점 · 적중률 · 평균 · 가장 나빴던 한 번 (F004 FR-33 · `FE-REQ-026` FR-141).
 *
 * 표본 부족(서버 `lowSample`)이면 비율 셋을 감추고 이유를 쓴다 — 성적표와 같은 판정이다. 문턱 숫자는 화면에 없다.
 */
export const SignalMetrics = ({ group }: { group: ScoreboardGroup }) => {
  const shown = !group.lowSample;
  const rate = (value: number | null, format: (v: number) => string) =>
    shown && value !== null ? format(value) : null;
  const cells: Array<{ term: string; value: string | null }> = [
    { term: M.metrics.sample, value: M.sampleValue(group.sample) },
    { term: M.metrics.winRate, value: rate(group.winRate, formatRatio) },
    { term: M.metrics.avgReturn, value: rate(group.avgReturn, formatSignedRate) },
    { term: M.metrics.worst, value: rate(group.worstObservedReturn, formatSignedRate) },
  ];
  return (
    <>
      <dl className={s.metrics}>
        {cells.map((cell) => (
          <div key={cell.term} className={gauge}>
            <dt className={gaugeLabel}>{cell.term}</dt>
            <dd className={cell.value === null ? s.metricValueMuted : s.metricValue}>
              {cell.value ?? M.lowSampleValue}
            </dd>
          </div>
        ))}
      </dl>
      <p className={hint}>
        {shown && group.excessWinRate !== null && `${SCOREBOARD_MESSAGES.excess(formatSignedPoints(group.excessWinRate))} · `}
        {group.horizonHours !== null && SCOREBOARD_MESSAGES.horizon(group.horizonHours)}
        {group.sampleOrigin === "backtest" && (
          <>
            {" "}
            <Badge size="sm" tone="neutral">
              {SCOREBOARD_MESSAGES.backtestBadge}
            </Badge>
          </>
        )}
      </p>
      {group.sampleOrigin === "backtest" && <p className={hint}>{SCOREBOARD_MESSAGES.backtestNote}</p>}
      {shown ? <p className={hint}>{M.worstNote}</p> : <p className={hint}>{M.lowSampleNote}</p>}
      <PerformanceClaimLine claim={group.claim} />
    </>
  );
};

/**
 * 관찰 기간 수익률 분포 — 구간 6개 가로 막대 + 같은 값의 표(FR-141). 막대는 장식이라 읽기 도구에서 숨기고 표가 말한다.
 *
 * `@repo/ui/barChart`(세로 막대)를 쓰지 않은 이유: 구간 이름("−20 ~ −10%")이 칸 너비를 넘으면 말줄임으로 잘린다 —
 * 390 폭에서 칸이 47px 이다. 가로 막대는 이름 칸 너비가 고정이라 잘리지 않는다.
 * 기간은 그룹이 말한다(단타 하루 · 장기 30일) — "30일" 고정이 아니다.
 */
export const ReturnDistributionBars = ({ distribution }: { distribution: ReturnDistribution | null }) => {
  if (!distribution) return <p className={hint}>{M.noDistribution}</p>;
  const horizon = M.horizonDays(distribution.horizonDays);
  const peak = Math.max(...distribution.buckets.map((bucket) => bucket.count), 0);
  const { p25, median, p75 } = distribution;
  return (
    <>
      <ul className={s.bars} aria-hidden="true">
        {distribution.buckets.map((bucket) => (
          <li key={bucket.code} className={s.barRow}>
            <span className={s.barLabel}>{M.bucketLabels[bucket.code]}</span>
            <span className={s.barTrack}>
              {bucket.count > 0 && (
                <span className={s.barFill} style={{ display: "block", width: `${((bucket.count / peak) * 100).toFixed(2)}%` }} />
              )}
            </span>
            <span className={s.barCount}>{M.bucketCount(bucket.count)}</span>
          </li>
        ))}
      </ul>
      <table className={srOnly}>
        <caption>{M.tableCaption(horizon)}</caption>
        <thead>
          <tr>
            <th scope="col">{M.colBucket}</th>
            <th scope="col">{M.colCount}</th>
          </tr>
        </thead>
        <tbody>
          {distribution.buckets.map((bucket) => (
            <tr key={bucket.code}>
              <th scope="row">{M.bucketLabels[bucket.code]}</th>
              <td>{M.bucketCount(bucket.count)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {p25 !== null && median !== null && p75 !== null && (
        <p className={gaugeStatus.normal}>{M.quartiles(formatSignedRate(p25), formatSignedRate(median), formatSignedRate(p75))}</p>
      )}
      <p className={hint}>{M.distributionNote}</p>
    </>
  );
};

interface SignalCaseColumnsProps {
  group: ScoreboardGroup;
  /** 서버가 이름을 못 붙인 종목의 자리(로고 · 이름). 시세 슬라이스 것이라 조합하는 위젯이 넣는다 */
  renderIdentity: (symbol: string) => ReactNode;
}

/**
 * 맞았던 때 · 틀렸던 때 — **같은 컴포넌트 · 같은 크기 · 같은 위계**로 나란히(FR-142 · B2). 좁은 폭은 위아래.
 * 둘 다 서버가 같은 상한 · 최근 순으로 보낸다 — 화면이 고르거나 자르지 않는다. 틀렸던 때를 접지 않는다.
 */
export const SignalCaseColumns = ({ group, renderIdentity }: SignalCaseColumnsProps) => (
  <div className={s.caseColumns}>
    <CaseColumn heading={M.hitsHeading} empty={M.noHits} cases={group.hits} renderIdentity={renderIdentity} />
    <CaseColumn heading={M.missesHeading} empty={M.noMisses} cases={group.misses} renderIdentity={renderIdentity} />
  </div>
);

const CaseColumn = ({
  heading,
  empty,
  cases,
  renderIdentity,
}: {
  heading: string;
  empty: string;
  cases: readonly ScoreboardCase[];
  renderIdentity: SignalCaseColumnsProps["renderIdentity"];
}) => (
  <section className={s.caseColumn}>
    <h3 className={s.caseHeading}>{heading}</h3>
    {cases.length === 0 ? (
      // 옅은 면 위 — `hint`(neutral 600)는 4.26:1 로 AA 미달(axe). 게이지 상태 글(700)
      <p className={gaugeStatus.normal}>{empty}</p>
    ) : (
      <ul className={s.caseList}>
        {cases.map((item, index) => (
          // 같은 날 · 같은 종목이 둘일 수 있다(단타 하루 두 번) — 자리 번호를 붙인다
          <li key={`${item.date}-${item.symbol}-${index}`} className={s.caseRow}>
            <span className={s.caseDate}>{formatShortDate(item.date) ?? item.date}</span>
            {item.name ? <CaseIdentity symbol={item.symbol} name={item.name} logoUrl={item.logoUrl} /> : renderIdentity(item.symbol)}
            <span className={s.caseReturn}>{formatSignedRate(item.returnRate)}</span>
          </li>
        ))}
      </ul>
    )}
  </section>
);
