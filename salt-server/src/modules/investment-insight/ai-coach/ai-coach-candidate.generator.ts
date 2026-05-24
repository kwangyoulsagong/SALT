import type { AICoachContext, Candidate } from "./ai-coach.types";

export class AICoachCandidateGenerator {
  generate(ctx: AICoachContext): Candidate[] {
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
      candidates.push({
        action: "rebalance",
        symbol: rebalanceSymbol,
      });
    }

    return candidates;
  }
}
