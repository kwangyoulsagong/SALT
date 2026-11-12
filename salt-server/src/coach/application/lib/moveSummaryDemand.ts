import type { MoveAsset } from "../../domain";
import { EXPLANATION_DEMAND_MAX, EXPLANATION_DEMAND_TTL_MS } from "./explanationDemand";

/**
 * 오늘 등락 한 줄을 본 종목(프로세스 메모리) — 해설 수요(`ExplanationDemand`)와 같은 규칙.
 * 읽기 경로는 LLM 을 부르지 않고 "보고 싶다"만 남기고 배치가 다음 회차에 그 종목을 먼저 본다(추적 밖 코인도)
 */
export class MoveSummaryDemand {
  private readonly seen = new Map<string, { asset: MoveAsset; symbol: string; at: number }>();

  want(asset: MoveAsset, symbol: string, now: Date): void {
    const key = `${asset}:${symbol}`;
    this.seen.delete(key);
    this.seen.set(key, { asset, symbol, at: now.getTime() });
    while (this.seen.size > EXPLANATION_DEMAND_MAX) this.seen.delete(this.seen.keys().next().value as string);
  }

  /** 최근 본 순(새것 먼저). 오래된 것은 지운다 */
  recent(now: Date): { asset: MoveAsset; symbol: string }[] {
    const cutoff = now.getTime() - EXPLANATION_DEMAND_TTL_MS;
    for (const [key, v] of this.seen) if (v.at < cutoff) this.seen.delete(key);
    return [...this.seen.values()].reverse().map(({ asset, symbol }) => ({ asset, symbol }));
  }
}
