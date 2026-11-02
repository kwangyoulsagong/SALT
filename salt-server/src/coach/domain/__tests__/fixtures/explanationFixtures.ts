import type { CoachExplanationInput } from "../../ports";
import type { CoachSymbolArticle } from "../../model";
import { assembleExplanationFacts } from "../../policy/explanationFacts";
import { makeModeDecision } from "../../policy/modeDecision";

/**
 * 해설 품질 픽스처 — FEATURE-008 FR-49 · `SRV-REQ-037` FR-15. 품질 테스트(`explanationQuality.test.ts`)와
 * 블라인드 평가지 스크립트(`scripts/explain-ab-sheet.ts`)가 **같은 입력**을 쓴다.
 *
 * **규칙이 실제로 만드는 판단 문장**(`makeModeDecision`)을 쓴다 — 손으로 쓴 문장은 규칙이 바뀌어도 그대로라 측정이 낡는다.
 * 변화율 · RSI · 심리 · 대형 체결 · 보유 · 결측 · 뉴스 수 · 티커(받침 있는 것 포함)를 섞는다. 가격 · 기사는 지어낸 값이다 —
 * 결정적이어야 측정을 다시 돌려 같은 값이 나온다.
 */

const SYMBOLS = ["BTC", "ETH", "SOL", "XRP", "ATOM", "TON", "DOGE", "ADA", "TRUMP", "LINK"];
const KOREAN = ["비트코인", "이더리움", "솔라나", "리플", "코스모스", "톤", "도지코인", "에이다", "오피셜트럼프", "체인링크"];
const SOURCES = ["코인니스", "블록미디어", "디센터", null];

const article = (i: number, k: number): CoachSymbolArticle => ({
  title: k % 3 === 0 ? `${SYMBOLS[i % 10]} 현물 ETF ${k + 1}일 연속 순유입` : `거래소 ${k + 1}곳 입출금 재개`,
  summary: k % 2 === 0 ? `관련 거래량이 ${10 + k}% 늘었다는 집계가 나왔다.` : null,
  source: SOURCES[(i + k) % SOURCES.length] ?? "",
  sentiment: k % 2 === 0 ? "positive" : null,
  url: `https://news.example/${i}/${k}`,
  publishedAt: new Date(Date.UTC(2026, 9, 1 + (i % 28), k)),
});

const fixture = (i: number) => {
  const mode = i % 2 === 0 ? "scalp" : "long_term";
  const change24h = [-8.4, -3.2, -0.6, 0, 0.9, 2.7, 4.5, 11.2][i % 8]!;
  const rsi = [18, 29, 45, 55, 71, 83][i % 6]!;
  const sentimentScore = [12, 35, 50, 68, 90][i % 5]!;
  const whale = i % 4 === 0 ? { buy: 3e9, sell: 1e9 } : i % 4 === 1 ? { buy: 2e8, sell: 9e8 } : { buy: 0, sell: 0 };
  const missingData = i % 9 === 0 ? ["sentiment", "whale_flow", "rsi"] : [];
  const decision = makeModeDecision({
    mode,
    symbol: SYMBOLS[i % 10]!,
    change24h,
    rsi: missingData.includes("rsi") ? undefined : rsi,
    sentimentScore: missingData.includes("sentiment") ? undefined : sentimentScore,
    whaleBuy: whale.buy,
    whaleSell: whale.sell,
    hasHolding: i % 3 === 0,
    missingData,
  });
  const input = assembleExplanationFacts({
    symbol: SYMBOLS[i % 10]!,
    mode,
    quote: {
      symbol: SYMBOLS[i % 10]!,
      assetType: "crypto",
      koreanName: KOREAN[i % 10]!,
      currentPrice: [152_340_000, 5_120_000, 231_500, 3_412, 9_870, 7_015, 412, 1_088, 15_230, 28_450][i % 10]!,
      change24h,
      tradeValue24h: [3.1e11, 8.4e10, 2.2e10, 5.5e9, 7.7e8][i % 5]!,
      priceUpdatedAt: new Date(Date.UTC(2026, 10, 1)),
    },
    judgment: {
      action: decision.action,
      label: decision.label,
      headline: decision.headline,
      reasons: decision.reasons,
      risks: decision.risks,
    },
    indicator: missingData.includes("rsi")
      ? undefined
      : { rsi14: rsi, ma20: null, ma50: null, volumeAvg20: null, timestamp: new Date(Date.UTC(2026, 10, 1)) },
    sentiment: missingData.includes("sentiment")
      ? undefined
      : { sentimentScore, sentimentLabel: sentimentScore > 60 ? "greed" : "fear", priceChange24h: change24h, calculatedAt: new Date(Date.UTC(2026, 10, 1)) },
    whale: { buyAmountKRW: whale.buy, sellAmountKRW: whale.sell, count: whale.buy + whale.sell > 0 ? 3 : 0 },
    news: Array.from({ length: i % 6 }, (_, k) => article(i, k)),
  });
  if (!input) throw new Error(`fixture ${i}: 현재가가 없다`);
  return { input, renderable: decision.reasons.length > 0 };
};

/**
 * 근거가 빈 판단은 3종 게이트가 막아 해설까지 오지 않는다(`SRV-REQ-024` FR-105 — 근거 = 비어 있지 않은 `reasons`).
 * 그래서 게이트를 지나는 판단만 50건 모은다 — 막히는 입력을 세면 "빈 근거 칸"을 해설 결함으로 잘못 센다
 */
export const explanationFixtures = (count: number): CoachExplanationInput[] => {
  const out: CoachExplanationInput[] = [];
  for (let i = 0; out.length < count; i += 1) {
    const f = fixture(i);
    if (f.renderable) out.push(f.input);
  }
  return out;
};
