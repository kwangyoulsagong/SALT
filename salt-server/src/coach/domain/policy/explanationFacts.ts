import { createHash } from "node:crypto";

import type {
  CoachIndicator,
  CoachMode,
  CoachQuote,
  CoachSentiment,
  CoachSymbolArticle,
} from "../model";
import type { CoachExplanationInput } from "../ports";

/**
 * 해설 사실 — **서버가 조립한다** (F009 슬라이스 0 C01 · `SRV-REQ-025` FR-58 · `FEATURE-008` FR-40).
 *
 * ## 왜 요청 본문을 믿지 않는가
 *
 * 2026-09-24 전에는 화면이 시세 · 근거 · 뉴스를 요청 본문에 실어 보냈고 서버는 그대로 해설기에 넘겼다.
 * 게이트는 서버가 다시 판정했지만 **그 판정과 문장의 사실이 같은 것**이라는 보장이 없었다 — 낡은 화면이나
 * 바뀐 요청으로 만든 문장 옆에 서버 성적표가 붙었다. 인증과 스키마 검증은 사실 검증이 아니다.
 *
 * 이제 요청은 `{ symbol, mode }` 뿐이고, 게이트가 판정한 **바로 그 재료**로 사실을 만든다. 화면이 보내는
 * 값이 없으니 고칠 수 있는 값도 없다. 응답의 `facts.hash` 로 어떤 사실로 만든 해설인지 남긴다.
 *
 * 화면에서 옮겨 적던 라벨과 모양은 그대로다(`buildExplainRequest` 의 것) — 템플릿 · 검증기가 라벨로 칸을 고른다.
 */

/** 근거 라벨. 템플릿이 "판단" · "근거" · "주의" 로 칸을 고른다(`explanationTemplate.ts`) */
export const EXPLANATION_EVIDENCE_LABEL = {
  judgment: "판단",
  reason: "근거",
  risk: "주의",
  rsi: "RSI",
  sentiment: "시장 심리",
  whaleBuy: "고래 매수 대금(원)",
  whaleSell: "고래 매도 대금(원)",
} as const;

/** 서버 스키마의 옛 상한 그대로 — 모델이 받는 양을 바꾸지 않는다 */
const EVIDENCE_MAX = 20;
const EVIDENCE_VALUE_MAX = 120;
export const EXPLANATION_NEWS_MAX = 5;
const NEWS_TITLE_MAX = 200;

const clip = (text: string, max = EVIDENCE_VALUE_MAX) => (text.length > max ? text.slice(0, max) : text);

export interface ExplanationMaterials {
  symbol: string;
  mode: CoachMode;
  quote: CoachQuote | undefined;
  judgment: { label: string; headline: string; reasons: string[]; risks: string[] };
  indicator: CoachIndicator | undefined;
  sentiment: CoachSentiment | undefined;
  whale: { buyAmountKRW: number; sellAmountKRW: number; count: number };
  news: CoachSymbolArticle[];
}

/**
 * 게이트가 본 재료로 해설 입력을 만든다. **현재가가 없으면 `null`** — 가격 없는 해설은 만들지 않는다.
 * 새 숫자를 만들지 않는다. 재료의 값을 라벨과 함께 옮겨 적는다.
 */
export const assembleExplanationFacts = (m: ExplanationMaterials): CoachExplanationInput | null => {
  const price = m.quote?.currentPrice;
  if (!price || price <= 0) return null;

  const label = EXPLANATION_EVIDENCE_LABEL;
  const evidence: CoachExplanationInput["evidence"] = [
    { label: label.judgment, value: clip(m.judgment.headline || m.judgment.label) },
    ...m.judgment.reasons.map((reason) => ({ label: label.reason, value: clip(reason) })),
    ...m.judgment.risks.map((risk) => ({ label: label.risk, value: clip(risk) })),
  ];
  const rsi = m.indicator?.rsi14;
  if (rsi !== null && rsi !== undefined) evidence.push({ label: label.rsi, value: String(Number(rsi)) });
  if (m.sentiment) {
    evidence.push({
      label: label.sentiment,
      value: clip(`${m.sentiment.sentimentScore} (${m.sentiment.sentimentLabel})`),
    });
  }
  if (m.whale.count > 0) {
    evidence.push({ label: label.whaleBuy, value: String(m.whale.buyAmountKRW) });
    evidence.push({ label: label.whaleSell, value: String(m.whale.sellAmountKRW) });
  }

  const news = m.news.slice(0, EXPLANATION_NEWS_MAX).map((item) => ({
    title: clip(item.title, NEWS_TITLE_MAX),
    ...(item.summary ? { summary: clip(item.summary, 500) } : {}),
    source: item.source,
    ...(item.sentiment ? { sentiment: item.sentiment } : {}),
  }));

  return {
    symbol: m.symbol,
    koreanName: m.quote?.koreanName || m.symbol,
    mode: m.mode,
    currentPrice: price,
    change24h: m.quote?.change24h ?? 0,
    tradeValue24h: m.quote?.tradeValue24h ?? 0,
    evidence: evidence.slice(0, EVIDENCE_MAX),
    ...(news.length > 0 ? { news } : {}),
  };
};

/** 해설이 쓴 사실의 지문. 같은 사실이면 같은 값 — 키 순서를 고정해 직렬화한다 */
export const explanationFactsHash = (input: CoachExplanationInput): string =>
  createHash("sha256")
    .update(
      JSON.stringify([
        input.symbol,
        input.koreanName,
        input.mode,
        input.currentPrice,
        input.change24h,
        input.tradeValue24h,
        input.evidence.map((e) => [e.label, e.value]),
        (input.news ?? []).map((n) => [n.title, n.summary ?? null, n.source ?? null, n.sentiment ?? null]),
      ])
    )
    .digest("hex");
