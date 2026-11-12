import { logger } from "../../shared/config/logger";
import {
  LLM_BUDGET_WINDOW_MS,
  llmBudgetVerdict,
  MOVE_SUMMARY_BATCH_MAX_PER_RUN,
  MOVE_SUMMARY_PROMPT_VERSION,
  MOVE_SUMMARY_VERIFIER_VERSION,
  moveSummaryFingerprint,
  moveSummaryPromptFacts,
  needsMoveSummary,
  resolveLlmLimits,
  verifyMoveSummary,
  type LlmBudgetLimits,
  type LlmUsageStore,
  type MoveAsset,
  type MoveCard,
  type MoveCardReader,
  type MoveSummaryStore,
  type MoveSummaryWriter,
  type TrackedAssetProbe,
} from "../domain";
import type { MoveSummaryDemand } from "./lib/moveSummaryDemand";

export interface GenerateMoveSummariesDeps {
  cards: MoveCardReader;
  store: MoveSummaryStore;
  writer: MoveSummaryWriter;
  tracked: TrackedAssetProbe;
  demand: MoveSummaryDemand;
  /** 종목 이름 — 프롬프트 한 줄(없으면 코드) */
  names: (symbols: string[]) => Promise<Map<string, string>>;
  usage?: LlmUsageStore;
  limits?: Partial<LlmBudgetLimits>;
  /** `MOVE_SUMMARY=off` 면 아무것도 하지 않는다(FR-7) */
  enabled: boolean;
  now?: () => Date;
}

export interface MoveSummaryBatchResult {
  candidates: number;
  /** 카드가 서지 않음 · 조용한 날 · 같은 지문 · 하루 상한 */
  skipped: number;
  generated: number;
  /** 검사가 막음(no_citation · guard_blocked) — 행은 남긴다 */
  blocked: number;
  /** LLM · 재료 실패 — 행 0, 다음 회차 */
  failed: number;
  /** 회차 상한 · LLM 상한 */
  deferred: number;
}

const KR_CODE = /^\d{6}$/;

/** 몫 중 무엇이 가장 컸나 — 숫자 대신 말로(프롬프트) */
const dominantOf = (split: NonNullable<MoveCard["split"]>): "idio" | "market" | "sector" => {
  if (split.method === "benchmark") return "idio";
  const parts: Array<["idio" | "market" | "sector", number]> = [
    ["idio", Math.abs(split.idio)],
    ["market", Math.abs(split.market)],
    ["sector", Math.abs(split.sector ?? 0)],
  ];
  return parts.sort((a, b) => b[1] - a[1])[0]![0];
};

/**
 * 오늘 등락 한 줄 배치 (F016 단계 D · `SRV-REQ-052` FR-1 · FR-5 · FR-6).
 *
 * 후보 = 최근 본 종목(새것 먼저) ∪ 추적 종목(코인 관심 · 보유 + 국내 유니버스). 카드가 서고 조용하지 않은 날만, 지문(사실 목록)이
 * 바뀐 것만 LLM → 검사 → 저장. **실패한 검사도 행으로 남긴다**(같은 지문 LLM 1회 · 품질 감사). LLM · 재료 실패는 행 0 — 다음 회차.
 * 하나씩 순서대로 · 트랜잭션 0(LLM 수 초~수십 초). 해설 배치 뒤 같은 LLM 워커에서 돈다
 */
export class GenerateMoveSummaries {
  constructor(private readonly deps: GenerateMoveSummariesDeps) {}

  private now(): Date {
    return this.deps.now?.() ?? new Date();
  }

  private async budget(): Promise<{ allowed: boolean; geminiAllowed: boolean }> {
    const usage = this.deps.usage;
    if (!usage) return { allowed: true, geminiAllowed: true };
    try {
      const verdict = llmBudgetVerdict(
        await usage.usageSince(new Date(this.now().getTime() - LLM_BUDGET_WINDOW_MS)),
        resolveLlmLimits(this.deps.limits)
      );
      if (verdict.exceeded === "total_tokens") return { allowed: true, geminiAllowed: false };
      return { allowed: verdict.allowed, geminiAllowed: verdict.allowed };
    } catch (error) {
      logger.warn(`오늘 등락 한 줄 — LLM 사용량 조회 실패, 이번 회차 쉼: ${(error as Error).message}`);
      return { allowed: false, geminiAllowed: false };
    }
  }

  private async candidates(now: Date): Promise<{ asset: MoveAsset; symbol: string }[]> {
    const seen = new Set<string>();
    const out: { asset: MoveAsset; symbol: string }[] = [];
    const push = (asset: MoveAsset, symbol: string) => {
      const key = `${asset}:${symbol}`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ asset, symbol });
      }
    };
    this.deps.demand.recent(now).forEach((d) => push(d.asset, d.symbol));
    for (const s of await this.deps.tracked.listTrackedSymbols()) push(KR_CODE.test(s) ? "kr" : "crypto", s.toUpperCase());
    return out;
  }

  async execute(): Promise<MoveSummaryBatchResult> {
    const result: MoveSummaryBatchResult = { candidates: 0, skipped: 0, generated: 0, blocked: 0, failed: 0, deferred: 0 };
    if (!this.deps.enabled) return result;
    const candidates = await this.candidates(this.now());
    result.candidates = candidates.length;
    let attempts = 0;

    for (const { asset, symbol } of candidates) {
      let card: MoveCard | null;
      try {
        card = await this.deps.cards.card(asset, symbol);
      } catch (error) {
        logger.warn(`오늘 등락 한 줄 — ${asset} ${symbol} 카드 실패: ${(error as Error).message}`);
        result.failed += 1;
        continue;
      }
      if (!card) {
        result.skipped += 1;
        continue;
      }
      const fingerprint = moveSummaryFingerprint(card);
      // 카드가 안 서는 날은 저장소를 읽지 않는다(후보 대부분)
      if (!card.show || !card.split) {
        result.skipped += 1;
        continue;
      }
      const day = await this.deps.store.day(asset, card.symbol, card.date, fingerprint);
      const need = needsMoveSummary({ card, current: day.current, latestOk: day.latestOk, attemptsToday: day.attempts, now: this.now() });
      if (need !== "generate") {
        result.skipped += 1;
        continue;
      }
      if (attempts >= MOVE_SUMMARY_BATCH_MAX_PER_RUN) {
        result.deferred += 1;
        continue;
      }
      const budget = await this.budget();
      if (!budget.allowed) {
        result.deferred += 1;
        continue;
      }

      attempts += 1;
      const facts = moveSummaryPromptFacts(card.facts);
      try {
        const name = (await this.deps.names([card.symbol]).catch(() => new Map<string, string>())).get(card.symbol) ?? card.symbol;
        const written = await this.deps.writer.write(
          { asset, name, direction: card.split.total >= 0 ? "up" : "down", dominant: dominantOf(card.split), facts },
          { geminiAllowed: budget.geminiAllowed }
        );
        const verdict = verifyMoveSummary(written.text, facts);
        await this.deps.store.save({
          asset,
          symbol: card.symbol,
          date: card.date,
          fingerprint,
          gate: verdict.ok ? "ok" : verdict.gate,
          text: verdict.ok ? verdict.text : null,
          citations: verdict.ok ? verdict.citations : [],
          factCount: facts.length,
          rejections: verdict.ok ? [] : verdict.reasons,
          provider: written.provider,
          model: written.model,
          promptVersion: MOVE_SUMMARY_PROMPT_VERSION,
          verifierVersion: MOVE_SUMMARY_VERIFIER_VERSION,
          generatedAt: this.now(),
        });
        if (verdict.ok) result.generated += 1;
        else result.blocked += 1;
      } catch (error) {
        // 원인 원문은 싣지 않는다 — 모델 응답이 섞일 수 있다(`ddd-infrastructure.md` §6)
        logger.warn(`오늘 등락 한 줄 — ${asset} ${symbol} 생성 실패: ${(error as Error).name}`);
        result.failed += 1;
      }
    }
    return result;
  }
}
