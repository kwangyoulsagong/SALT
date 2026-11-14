import {
  FACT_EXTRACTOR_VERSION,
  LLM_BUDGET_WINDOW_MS,
  type ExtractedFactRow,
  type ExtractedFactStore,
  type FactExtractor,
  type FactSourceReader,
  type LlmBudgetLimits,
  type LlmUsageStore,
  checkExtractedFacts,
  factSourceText,
  llmBudgetVerdict,
  reservedCallsBehind,
  resolveLlmLimits,
} from "../domain";
import { logger } from "../../shared/config/logger";

/** 한 회차 상한 — 10분 회차 · 로컬 CLI 한 건 수 초~수십 초 */
const PER_TICK = 12;

export interface FactExtractionResult {
  candidates: number;
  extracted: number;
  facts: number;
  dropped: number;
  failed: number;
  /** 상한 · 꺼짐으로 다음 회차 */
  deferred: number;
}

export interface ExtractArticleFactsDeps {
  sources: FactSourceReader;
  extractor: FactExtractor;
  facts: ExtractedFactStore;
  usage?: LlmUsageStore;
  limits?: Partial<LlmBudgetLimits>;
  enabled: boolean;
  now?: () => Date;
}

/**
 * 사실 추출 배치(F017 v4 2c · `SRV-REQ-053` FR-14) — AI 경로 본문 → LLM 이 읽고 → 도메인 검사(숫자 원문 대조 · 문장 금지) → 사실만 저장.
 * 사건 종류는 제목에 예측 사전을 대 정한다(LLM 이 정하지 않는다). 기사 문장은 저장하지 않는다 — 본문 문단은 추출이 끝나면 `news` 가 지운다.
 * 해설 · 오늘 등락 한 줄 **뒤**에 같은 LLM 회차에서 하나씩 · 트랜잭션 0 · 상한은 앞 배치들이 남겨 둔 몫까지
 */
export class ExtractArticleFacts {
  constructor(private readonly deps: ExtractArticleFactsDeps) {}

  private now() {
    return this.deps.now?.() ?? new Date();
  }

  private async budget(): Promise<{ allowed: boolean; geminiAllowed: boolean }> {
    const usage = this.deps.usage;
    if (!usage) return { allowed: true, geminiAllowed: true };
    try {
      const verdict = llmBudgetVerdict(
        await usage.usageSince(new Date(this.now().getTime() - LLM_BUDGET_WINDOW_MS)),
        resolveLlmLimits(this.deps.limits),
        reservedCallsBehind("factExtract"),
      );
      if (verdict.exceeded === "total_tokens") return { allowed: true, geminiAllowed: false };
      return { allowed: verdict.allowed, geminiAllowed: verdict.allowed };
    } catch (error) {
      logger.warn(`사실 추출 — LLM 사용량 조회 실패, 이번 회차 쉼: ${(error as Error).message}`);
      return { allowed: false, geminiAllowed: false };
    }
  }

  async execute(): Promise<FactExtractionResult> {
    const result: FactExtractionResult = { candidates: 0, extracted: 0, facts: 0, dropped: 0, failed: 0, deferred: 0 };
    if (!this.deps.enabled) return result;
    const bodies = await this.deps.sources.pending(PER_TICK);
    result.candidates = bodies.length;
    for (const [i, body] of bodies.entries()) {
      const budget = await this.budget();
      if (!budget.allowed) {
        result.deferred += bodies.length - i;
        break;
      }
      const source = factSourceText(body.title, body.paragraphs);
      let output: string;
      try {
        output = (await this.deps.extractor.extract({ title: body.title, source }, { geminiAllowed: budget.geminiAllowed })).output;
      } catch (error) {
        result.failed += 1;
        logger.warn("[coach] fact extract failed", { key: body.key, message: String((error as Error).message ?? "").slice(0, 120) });
        await this.deps.sources.mark(body.key, "failed", this.now());
        continue;
      }
      const checked = checkExtractedFacts(output, source);
      if (checked.malformed) {
        result.failed += 1;
        await this.deps.sources.mark(body.key, "failed", this.now());
        continue;
      }
      const disclosure = body.via === "dart";
      const [kind] = await this.deps.sources.kindsOf(body.market, disclosure ? "disclosure" : "news", [{ title: body.title, codes: body.symbols.length }]);
      const rows: ExtractedFactRow[] = checked.kept.map((f) => ({
        sourceKind: disclosure ? "disclosure" : "article",
        sourceKey: body.key,
        symbols: body.symbols,
        who: f.who,
        what: f.what,
        amount: f.amount,
        unit: f.unit,
        comparedTo: f.comparedTo,
        whenText: f.whenText,
        eventKind: kind ?? "other",
        publishedAt: body.publishedAt,
        // 사실을 안 시각 = 본문을 받은 시각(게시 뒤) — 이 시각 전 봉에 이 사실을 쓰지 않는다(`time-and-leakage.md`)
        availableAt: body.fetchedAt.getTime() > body.publishedAt.getTime() ? body.fetchedAt : body.publishedAt,
        sourceUrl: body.url,
        sourceName: body.sourceName,
        extractorVersion: FACT_EXTRACTOR_VERSION,
      }));
      result.facts += rows.length > 0 ? await this.deps.facts.saveMany(rows, this.now()) : 0;
      result.dropped += checked.dropped.length;
      result.extracted += 1;
      await this.deps.sources.mark(body.key, "done", this.now());
    }
    return result;
  }
}
