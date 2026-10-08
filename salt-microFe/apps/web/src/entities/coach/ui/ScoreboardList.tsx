import type { JudgmentScoreboardView, ScoreboardCase, ScoreboardGroup } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import type { ReactNode } from "react";

import { formatRatio, formatShortDate, formatSignedPoints, formatSignedRate } from "../lib";
import { SCOREBOARD_MESSAGES } from "../model";
import { caseList } from "./CoachDetail.css";
import { PerformanceClaimLine } from "./PerformanceClaimLine";
import { gauge, gaugeLabel, gaugeList, gaugeStatus, gaugeValue, gaugeValueMuted, hint, missRow } from "./TradeRisk.css";

const S = SCOREBOARD_MESSAGES;

/** 최근 빗나간 판정을 몇 건 보이나 — 리서치 §9-3 "최근 빗나간 3건" */
const RECENT_MISS_COUNT = 3;

/** 그룹 키의 이름 — 국내 주식 키는 `kr_stock.` 접두를 떼고 같은 이름을 쓴다(자산군은 머리가 말한다) */
const labelOf = (signalType: string): string | undefined => S.signalTypes[signalType.replace(/^kr_stock\./, "")];

const ASSET_CLASSES = ["crypto", "kr_stock"] as const;

interface ScoreboardListProps {
  view: JudgmentScoreboardView;
  /** 종목 자리(로고 · 이름). 시세 슬라이스 것이라 조합하는 위젯이 넣는다 */
  renderIdentity: (symbol: string) => ReactNode;
}

/**
 * 판정 성적표 — 신호 유형별 성적 + 최근 빗나간 판정 (F010 슬라이스 3 · `FE-REQ-040` FR-6).
 *
 * - 표본 부족(서버 `lowSample`)이면 적중률 대신 **감춘 이유**를 쓴다. 문턱 숫자는 화면에 없다 — 서버 판정이다
 * - 기준 대비(`excessWinRate`)는 적중률 옆에 늘 같이 — 0 근처면 판단이 아니라 시장 방향을 맞힌 것이다
 * - 빗나간 판정은 **최근 순**으로만 고른다(선별 없음). 좋은 사례를 따로 뽑아 올리지 않는다
 * - 그룹마다 성적 4요소 줄(기간 · 표본 · 기준 · 빗나간 수, F009 FR-33) — 표본 부족이어도 그린다
 */
export const ScoreboardList = ({ view, renderIdentity }: ScoreboardListProps) => {
  const groups = view.groups.filter((group) => labelOf(group.signalType));
  // 자산군마다 따로 — 국내 주식 성적은 국내 주식 표본만이고 코인과 합치지 않는다(F011 FR-65). 하나뿐이면 머리 없이 전과 같다
  const sections = ASSET_CLASSES.map((assetClass) => ({
    assetClass,
    groups: groups.filter((group) => (group.assetClass ?? "crypto") === assetClass),
  })).filter((section) => section.groups.length > 0);
  if (sections.length <= 1) return <ScoreboardSection groups={groups} renderIdentity={renderIdentity} />;
  return (
    <>
      {sections.map((section) => (
        <section key={section.assetClass} aria-label={S.assetClasses[section.assetClass]}>
          <p className={gaugeLabel}>{S.assetClasses[section.assetClass]}</p>
          <ScoreboardSection groups={section.groups} renderIdentity={renderIdentity} />
        </section>
      ))}
    </>
  );
};

/** 한 자산군의 그룹 성적 + 최근 빗나간 판정 */
const ScoreboardSection = ({
  groups,
  renderIdentity,
}: {
  groups: ScoreboardGroup[];
  renderIdentity: ScoreboardListProps["renderIdentity"];
}) => {
  const misses: ScoreboardCase[] = groups
    .flatMap((group) => group.misses)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, RECENT_MISS_COUNT);

  return (
    <>
      <ul className={gaugeList}>
        {groups.map((group) => {
          const shown = !group.lowSample && group.winRate !== null;
          // 적중률이 값 줄, 기준 대비 · 평균은 그 아래 — 한 줄에 셋이면 좁은 칸에서 숫자가 끊긴다
          const detail = shown
            ? [
                group.excessWinRate !== null ? S.excess(formatSignedPoints(group.excessWinRate)) : null,
                group.avgReturn !== null ? S.avgReturn(formatSignedRate(group.avgReturn)) : null,
              ].filter(Boolean)
            : [];
          return (
            <li key={group.signalType} className={gauge}>
              <span className={gaugeLabel}>{labelOf(group.signalType)}</span>
              <span className={shown ? gaugeValue : gaugeValueMuted}>
                {shown ? S.winRate(formatRatio(group.winRate ?? 0)) : S.lowSample}
              </span>
              {detail.length > 0 && <span className={gaugeStatus.normal}>{detail.join(" · ")}</span>}
              <span className={gaugeStatus.normal}>
                <Badge size="sm" tone="neutral">
                  {S.sample(group.sample)}
                </Badge>{" "}
                {group.horizonHours !== null && S.horizon(group.horizonHours)}
              </span>
              <PerformanceClaimLine claim={group.claim} />
            </li>
          );
        })}
      </ul>
      <p className={gaugeLabel}>{S.missesHeading}</p>
      {misses.length === 0 ? (
        <p className={hint}>{S.noMisses}</p>
      ) : (
        <ul className={caseList}>
          {misses.map((item, index) => (
            // 같은 날 · 같은 종목 · 같은 판단이 둘일 수 있다(단타 하루 두 번) — 자리 번호를 붙인다
            <li key={`${item.date}-${item.symbol}-${item.event}-${index}`} className={missRow}>
              <span>{formatShortDate(item.date) ?? item.date}</span>
              {renderIdentity(item.symbol)}
              <span>{S.missLine(labelOf(item.event) ?? "", formatSignedRate(item.returnRate))}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default ScoreboardList;
