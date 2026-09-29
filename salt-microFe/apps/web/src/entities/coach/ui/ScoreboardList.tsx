import type { JudgmentScoreboardView, ScoreboardCase } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";
import type { ReactNode } from "react";

import { formatRatio, formatShortDate, formatSignedPoints, formatSignedRate } from "../lib";
import { SCOREBOARD_MESSAGES } from "../model";
import { caseList, caseRow } from "./CoachDetail.css";
import { gauge, gaugeLabel, gaugeList, gaugeStatus, gaugeValue, gaugeValueMuted, hint } from "./TradeRisk.css";

const S = SCOREBOARD_MESSAGES;

/** 최근 빗나간 판정을 몇 건 보이나 — 리서치 §9-3 "최근 빗나간 3건" */
const RECENT_MISS_COUNT = 3;

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
 */
export const ScoreboardList = ({ view, renderIdentity }: ScoreboardListProps) => {
  const groups = view.groups.filter((group) => S.signalTypes[group.signalType]);
  const misses: ScoreboardCase[] = groups
    .flatMap((group) => group.misses)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
    .slice(0, RECENT_MISS_COUNT);

  return (
    <>
      <ul className={gaugeList}>
        {groups.map((group) => {
          const shown = !group.lowSample && group.winRate !== null;
          const stats = shown
            ? [
                S.winRate(formatRatio(group.winRate ?? 0)),
                group.excessWinRate !== null ? S.excess(formatSignedPoints(group.excessWinRate)) : null,
                group.avgReturn !== null ? S.avgReturn(formatSignedRate(group.avgReturn)) : null,
              ].filter(Boolean)
            : [];
          return (
            <li key={group.signalType} className={gauge}>
              <span className={gaugeLabel}>{S.signalTypes[group.signalType]}</span>
              <span className={shown ? gaugeValue : gaugeValueMuted}>{shown ? stats.join(" · ") : S.lowSample}</span>
              <span className={gaugeStatus.normal}>
                <Badge size="sm" tone="neutral">
                  {S.sample(group.sample)}
                </Badge>{" "}
                {group.horizonHours !== null && S.horizon(group.horizonHours)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className={gaugeLabel}>{S.missesHeading}</p>
      {misses.length === 0 ? (
        <p className={hint}>{S.noMisses}</p>
      ) : (
        <ul className={caseList}>
          {misses.map((item) => (
            <li key={`${item.date}-${item.symbol}-${item.event}`} className={caseRow}>
              <span>{formatShortDate(item.date) ?? item.date}</span>
              {renderIdentity(item.symbol)}
              <span>{S.missLine(S.signalTypes[item.event] ?? "", formatSignedRate(item.returnRate))}</span>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};

export default ScoreboardList;
