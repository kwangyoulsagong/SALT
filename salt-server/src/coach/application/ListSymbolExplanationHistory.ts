import {
  EXPLANATION_HISTORY_DAYS,
  explanationTradeDay,
  type CoachMode,
  type ExplainProvider,
  type ExplanationSentence,
  type ExplanationSnapshotStore,
  type ForecastReader,
  type MarketProbe,
} from "../domain";
import { JUDGMENT_DISCLAIMER } from "./lib/judgmentTrack";

/** 지난 날 해설 하루 — 그날 마지막 저장본 원문 그대로 + 그날 · 그 뒤 등락(서버 계산) */
export interface ExplanationHistoryDay {
  /** KST 날짜 `YYYY-MM-DD` */
  tradeDay: string;
  /** 그 해설을 만든 시각(ISO) — 화면은 "이 시각 기준 · 그 뒤 소식은 반영 안 됨"을 같이 보인다 */
  generatedAt: string;
  /** 그날 판정(`ModeDecisionAction`) */
  action: string;
  provider: ExplainProvider;
  /** 저장 원문 — '얼마나 믿을까' · '틀렸던 때'(지금 값으로 쓰는 문장)는 뺀다. 그날 문장에 오늘 숫자를 섞지 않는다 */
  sentences: ExplanationSentence[];
  /** 그날 종가의 전 봉 대비 %(소수 2자리) — 그날 닫힌 봉이 없으면 `null`(휴장일 · 수집 빈칸) */
  dayChangeRate: number | null;
  /** 그날 종가 → 지금 가격 %(소수 2자리) — 그날 종가나 지금 가격이 없으면 `null` */
  changeSinceRate: number | null;
}

export interface SymbolExplanationHistoryView {
  symbol: string;
  mode: CoachMode;
  /** 오늘(KST) 이전 날만, 최신 날 먼저. 빗나간 날도 고르지 않고 다 — 골라 보여 주기 0 */
  days: ExplanationHistoryDay[];
  disclaimer: string;
}

export interface ListSymbolExplanationHistoryDeps {
  store: ExplanationSnapshotStore;
  market: Pick<MarketProbe, "quotes">;
  closes: Pick<ForecastReader, "dailyCloses">;
  now?: () => Date;
}

const pct = (to: number, from: number) => Math.round((to / from - 1) * 10000) / 100;

/**
 * 지난 날 해설 읽기 (`SRV-REQ-063` FR-4). 사용자: "어제 폭락했는데 오늘 올랐다 — 어제 판단이 어땠고 그 뒤 어떻게 됐나".
 *
 * **저장값만 읽는다** — LLM 0 · 다시 만들지 않는다. 과거 날짜 해설을 지금 다시 만들면 모델이 그 뒤 흐름을 알고 쓴 문장이 섞인다(사후 지식).
 * 등락은 닫힌 일봉 종가와 지금 가격으로 서버가 나눈다(금액 · 비율 계산은 서버, 공통 수용 기준 3). 시장 층 — 사람마다 같은 답
 */
export class ListSymbolExplanationHistory {
  constructor(private readonly deps: ListSymbolExplanationHistoryDeps) {}

  async execute(rawSymbol: string, mode: CoachMode, limit: number): Promise<SymbolExplanationHistoryView> {
    const symbol = rawSymbol.toUpperCase();
    const now = this.deps.now?.() ?? new Date();
    const today = explanationTradeDay(now);
    const since = new Date(now.getTime() - EXPLANATION_HISTORY_DAYS * 86_400_000);
    const before = new Date(`${today}T00:00:00+09:00`);

    const records = await this.deps.store.listDaily(symbol, mode, { since, before, limit });
    if (records.length === 0) return { symbol, mode, days: [], disclaimer: JUDGMENT_DISCLAIMER };

    // 등락은 덤이다 — 못 읽으면 문장은 그대로 두고 숫자만 비운다
    const [bars, quotes] = await Promise.all([
      this.deps.closes
        .dailyCloses([symbol], new Date(since.getTime() - 7 * 86_400_000))
        .then((m) => m.get(symbol) ?? [])
        .catch(() => []),
      this.deps.market.quotes([symbol]).catch(() => new Map()),
    ]);
    const closes = bars.map((b) => ({ day: explanationTradeDay(b.openTime), close: Number(b.close) })).filter((b) => b.close > 0);
    const current = quotes.get(symbol)?.currentPrice;

    const days = records.map((r): ExplanationHistoryDay => {
      const tradeDay = explanationTradeDay(r.generatedAt);
      const i = closes.findIndex((b) => b.day === tradeDay);
      const close = i >= 0 ? closes[i]!.close : null;
      return {
        tradeDay,
        generatedAt: r.generatedAt.toISOString(),
        action: r.action,
        provider: r.provider,
        sentences: r.sentences.filter((x) => x.section !== "track" && x.section !== "miss"),
        dayChangeRate: close !== null && i > 0 ? pct(close, closes[i - 1]!.close) : null,
        changeSinceRate: close !== null && current && current > 0 ? pct(current, close) : null,
      };
    });
    return { symbol, mode, days, disclaimer: JUDGMENT_DISCLAIMER };
  }
}
