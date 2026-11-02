import type { MarketRegimeView } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";

import { formatShortDate, formatSignedRate } from "../lib";
import { RISK_MESSAGES } from "../model";
import { gaugeLabel, hint, line, lines, marketNote, marketNoteHead } from "./TradeRisk.css";

const { market: MARKET } = RISK_MESSAGES;

/**
 * 시장 국면 — **참고 라벨** (F010 슬라이스 3 · `FE-REQ-040` FR-3).
 *
 * 서버가 준 BTC 200일선 위치 · 1년 고점 대비 · 다음 거시 일정을 한 칸에 둔다.
 * 사전등록 `regime-gate@1` 이 게이트를 채택하지 않았다(`gateAdopted: false`) — "판정 · 비중에 쓰지 않아요"가 늘 같이
 * 나간다. 이 칸이 "지금 사지 마세요"로 읽히면 검증 결과와 반대를 말하는 것이다.
 *
 * **국면 모델의 고변동 확률(`highVolProbability`)은 그리지 않는다.** 숫자로 쓰면 보정 검증을 거친 판정 확률로 읽히고
 * (리서치 §9-3 표본 게이트), 라벨로 접으려면 경계가 필요한데 임계는 서버가 정한다. 서버가 국면 라벨을 주면 그때 붙인다.
 */
export const MarketRegimeNote = ({ market }: { market: MarketRegimeView }) => {
  const asOf = formatShortDate(market.asOf);
  const nextAt = market.nextEvent ? formatShortDate(market.nextEvent.at) : null;
  const facts = [
    market.trendOpen === null ? null : market.trendOpen ? MARKET.trend.above : MARKET.trend.below,
    market.drawdown365dRate === null ? null : MARKET.drawdown(formatSignedRate(market.drawdown365dRate)),
    market.nextEvent && nextAt ? MARKET.nextEvent(market.nextEvent.kind, nextAt) : null,
  ].filter((fact): fact is string => fact !== null);

  return (
    <section className={marketNote} aria-label={MARKET.heading}>
      <div className={marketNoteHead}>
        <span className={gaugeLabel}>{MARKET.heading}</span>
        <Badge size="sm" tone="neutral">
          {MARKET.badge}
        </Badge>
        {asOf && <span className={hint}>{MARKET.asOf(asOf)}</span>}
      </div>
      <ul className={lines}>
        {facts.map((fact) => (
          <li key={fact} className={line}>
            {fact}
          </li>
        ))}
      </ul>
      <p className={hint}>{market.gateAdopted ? MARKET.gateAdopted : MARKET.noGate}</p>
    </section>
  );
};

export default MarketRegimeNote;
