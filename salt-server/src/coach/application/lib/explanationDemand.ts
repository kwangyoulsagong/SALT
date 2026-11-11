import type { CoachMode } from "../../domain";

/** 최근에 본 종목을 기억하는 시간 · 수 — 추적 목록 밖 종목도 다음 회차에 AI 해설이 생기게 */
export const EXPLANATION_DEMAND_TTL_MS = 24 * 60 * 60 * 1000;
export const EXPLANATION_DEMAND_MAX = 100;

/**
 * 해설을 본 종목 · 모드(프로세스 메모리). 읽기 경로가 적고 배치가 읽는다 — 읽기 경로는 LLM 을 부르지 않고 "보고 싶다"만 남긴다.
 * 재기동하면 비지만 다음에 보는 순간 다시 찬다(추적 종목은 이것과 무관하게 배치가 늘 본다)
 */
export class ExplanationDemand {
  private readonly seen = new Map<string, { symbol: string; mode: CoachMode; at: number }>();

  want(symbol: string, mode: CoachMode, now: Date): void {
    const key = `${symbol}:${mode}`;
    this.seen.delete(key);
    this.seen.set(key, { symbol, mode, at: now.getTime() });
    // Map 은 넣은 순서 — 가장 오래된 것부터 버린다
    while (this.seen.size > EXPLANATION_DEMAND_MAX) {
      const oldest = this.seen.keys().next().value as string;
      this.seen.delete(oldest);
    }
  }

  /** 최근 본 순(새것 먼저). 오래된 것은 지운다 */
  recent(now: Date): { symbol: string; mode: CoachMode }[] {
    const cutoff = now.getTime() - EXPLANATION_DEMAND_TTL_MS;
    for (const [key, v] of this.seen) if (v.at < cutoff) this.seen.delete(key);
    return [...this.seen.values()].reverse().map(({ symbol, mode }) => ({ symbol, mode }));
  }
}
