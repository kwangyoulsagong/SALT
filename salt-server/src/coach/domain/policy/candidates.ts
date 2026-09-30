import type { Candidate, CoachContext } from "../model";

/**
 * 후보 생성 — `ai-coach-candidate.generator` 에서 옮겨온 **순수 생성**.
 *
 * 종목마다 `buy` · `hold` 를 놓고, 보유 중이면 `sell` 을 더한다. 마지막으로
 * 리밸런싱 후보를 하나 붙인다. 점수는 여기서 매기지 않는다 (`score.ts`).
 */
export const generateCandidates = (ctx: CoachContext): Candidate[] => {
  const candidates: Candidate[] = [];

  for (const symbol of ctx.candidateSymbols) {
    candidates.push({ action: "buy", symbol });
    candidates.push({ action: "hold", symbol });

    if (ctx.symbolFeatures.get(symbol)?.holding) {
      candidates.push({ action: "sell", symbol });
    }
  }

  const rebalanceSymbol =
    ctx.portfolioState.largestAsset ??
    ctx.topHolding?.symbol ??
    ctx.candidateSymbols[0];

  if (rebalanceSymbol) {
    candidates.push({ action: "rebalance", symbol: rebalanceSymbol });
  }

  return candidates;
};

/**
 * 거래소 투자유의 종목을 뺀다(F010 슬라이스 6 · `SRV-REQ-024` FR-193). 순위는 그대로 — 남은 것끼리 앞으로 당긴다.
 * 보유 종목의 매도 후보도 빠진다: 유의 종목에는 판정을 내지 않는다(판정 게이트 `exchange_warning` 과 같은 정책).
 */
export const withoutExchangeWarning = <T extends { symbol: string }>(
  ranked: T[],
  flags: ReadonlyMap<string, { warning: boolean }>
): T[] => ranked.filter((c) => flags.get(c.symbol)?.warning !== true);
