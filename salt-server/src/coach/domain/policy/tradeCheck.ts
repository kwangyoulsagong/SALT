/**
 * 사기 전 · 팔기 전 점검 — 맨 위 쉬운 한 줄(F017 v2 단계 2 · `SRV-REQ-053` FR-4).
 *
 * 숫자는 전부 예측 배치 `base-rate@1`(`forecast.v_base_rate` · `v_base_rate_trigger`)에서 온다. 여기는
 * ① 지금 시세가 어느 조건 문턱을 넘었나(숫자 비교만 — 조건 정의는 예측 한 곳) ② 그 조건의 과거 분포로 한 문장.
 *
 * 문장 규칙(공통 수용 기준 4 · 리서치 v2 규칙 9):
 * - 실제 숫자만 · 조건 · 기간 · 시장 단위를 같은 문장에 · 명령형 0 · 확신 표현 0
 * - 유효 n < 100(below_min)이면 비율 0 — "비슷한 상황이 아직 n번뿐이에요"
 * - '평소보다 많아요/적어요'는 예측이 Holm 을 통과시킨 행(`differs`)에서만
 * - 팔기 전 문장에 매입가 · 내 손익 0 — 확정 손익은 펼침 칸(`realizedPct`)에만
 */

/** 사전등록 키 — 조건 정의 · 문턱이 바뀌면 새 키(`base-rate@2`). 원장도 키로 갈린다 */
export const BASE_RATE_KEY = "base-rate@1";

export type TradeCheckMarket = "kr" | "crypto";
export type TradeCheckSide = "buy" | "sell";
export type TradeCheckStatus = "ok" | "below_min" | "no_condition";
/** 조건을 못 찾은 이유 — 지어내지 않는다 */
export type TradeCheckNoConditionReason = "none_matched" | "stale_reference" | "not_covered";

export interface BaseRateRow {
  market: TradeCheckMarket;
  conditionId: string;
  horizon: number;
  asOf: Date;
  kind: "usual" | "test" | "describe";
  status: "ok" | "below_min";
  sample: number;
  sampleEff: number;
  sampleDays: number;
  upRate: number | null;
  upLow: number | null;
  upHigh: number | null;
  mean: number | null;
  q10: number | null;
  q50: number | null;
  q90: number | null;
  holdUpRate: number | null;
  holdQ10: number | null;
  holdQ50: number | null;
  holdQ90: number | null;
  differs: "higher" | "lower" | null;
  recentDiffers: boolean | null;
}

export interface BaseRateTriggerRow {
  conditionId: string;
  appliesTo: "next" | "closed";
  refClose: number;
  refAt: Date;
  priceAtLeast: number | null;
  priceAtMost: number | null;
  openAtLeast: number | null;
  valueAtLeast: number | null;
}

export interface LiveQuote {
  price: number | null;
  /** 오늘 시가 — 국내만(K3) */
  open: number | null;
  /** 오늘 누적 거래대금(원) — 국내 K2 */
  tradeValue: number | null;
  /** 시세가 마지막으로 바뀐 시각 — 기준 봉보다 뒤여야 지금 가격으로 문턱을 비교한다 */
  updatedAt: Date | null;
}

/** 여러 조건이 겹치면 이 순서로 하나를 주인공으로 — 더 드문 · 사용자가 겪는 장면 먼저(사전등록 표 순서가 아니다) */
export const CONDITION_PRIORITY: Readonly<Record<TradeCheckMarket, readonly string[]>> = {
  kr: ["K4", "K2", "K1", "K6", "K3", "K8"],
  crypto: ["C7", "C2", "C1", "C3L", "C3S", "C8"],
};

/** 쉬운 말 — 사전등록 조건 정의(`salt-forecast/preregistration/2026-11-11-base-rate.toml`)를 사람 말로 */
export const CONDITION_PHRASE: Readonly<Record<string, string>> = {
  K1: "평소보다 크게 내린 날",
  K2: "거래가 몰리며 평소보다 크게 오른 날",
  K3: "시가가 어제 종가보다 3% 넘게 높게 시작한 날",
  K4: "상한가 근처로 마친 날",
  K6: "3일 연속 내리며 8% 넘게 빠진 날",
  K8: "RSI 70 이상에 5% 넘게 오른 날",
  C1: "작은 코인이 하루 새 평소보다 크게 오른 때",
  C2: "큰 코인이 하루 새 평소보다 크게 오른 때",
  C3S: "작은 코인이 하루 새 평소보다 크게 내린 때",
  C3L: "큰 코인이 하루 새 평소보다 크게 내린 때",
  C7: "새로 상장한 다음 날",
  C8: "RSI 70 이상에 하루 새 5% 넘게 오른 때",
};

/** 요약 문장의 기간 — 지평 1(국내 거래일 · 코인 하루) */
export const HORIZON_PHRASE: Readonly<Record<TradeCheckMarket, Readonly<Record<number, string>>>> = {
  kr: { 1: "다음 거래일 종가까지", 5: "5거래일 뒤 종가까지" },
  crypto: { 1: "하루 동안", 5: "5일 동안" },
};

export const SUMMARY_HORIZON = 1;
/** 기준 종가가 이보다 묵으면 조건을 판정하지 않는다 — 국내는 주말 · 연휴(4일), 코인은 매일 봉(2일) */
export const STALE_REFERENCE_MS: Readonly<Record<TradeCheckMarket, number>> = {
  kr: 4 * 86_400_000,
  crypto: 2 * 86_400_000,
};

/**
 * 어느 문턱 묶음을 쓸까 — **시세가 기준 봉보다 뒤에 갱신됐을 때만** 다음 장 문턱(next)과 지금 가격을 비교한다.
 * 아니면(국내 장 마감 뒤 저녁 · 주말 · 갱신이 멈춘 시세) 마지막 종가에 이미 성립한 조건(closed)을 본다.
 * 2026-11-11 결함: 한 달 묵은 시세(전일 종가 70만)를 어제 종가(33.9만) 문턱과 비교해 '상한가 근처'라고 말했다
 */
export const triggerSet = (refAt: Date, priceUpdatedAt: Date | null): "next" | "closed" =>
  priceUpdatedAt !== null && priceUpdatedAt > refAt ? "next" : "closed";

const meets = (t: BaseRateTriggerRow, q: LiveQuote): boolean => {
  if (t.appliesTo === "closed") return true;
  if (t.priceAtLeast !== null && (q.price === null || q.price < t.priceAtLeast)) return false;
  if (t.priceAtMost !== null && (q.price === null || q.price > t.priceAtMost)) return false;
  if (t.openAtLeast !== null && (q.open === null || q.open < t.openAtLeast)) return false;
  if (t.valueAtLeast !== null && (q.tradeValue === null || q.tradeValue < t.valueAtLeast)) return false;
  return true;
};

export interface ConditionMatch {
  matched: string[];
  /** 문턱이 하나도 없으면 null */
  refAt: Date | null;
  reason: TradeCheckNoConditionReason | null;
}

/** 지금 성립한 조건(우선순위 순). 모르는 값(시가 · 거래대금 없음)은 성립으로 치지 않는다 */
export const matchConditions = (
  market: TradeCheckMarket,
  triggers: readonly BaseRateTriggerRow[],
  quote: LiveQuote,
  now: Date
): ConditionMatch => {
  if (triggers.length === 0) return { matched: [], refAt: null, reason: "not_covered" };
  const refAt = triggers.reduce((a, t) => (t.refAt > a ? t.refAt : a), triggers[0].refAt);
  if (now.getTime() - refAt.getTime() > STALE_REFERENCE_MS[market]) {
    return { matched: [], refAt, reason: "stale_reference" };
  }
  const set = triggerSet(refAt, quote.updatedAt);
  const hit = new Set(triggers.filter((t) => t.appliesTo === set && meets(t, quote)).map((t) => t.conditionId));
  const matched = CONDITION_PRIORITY[market].filter((id) => hit.has(id));
  return { matched, refAt, reason: matched.length === 0 ? "none_matched" : null };
};

/** 100번 중 몇 번 — 반올림 정수 */
const outOf100 = (rate: number) => Math.round(rate * 100);
const pct = (r: number) => `${r >= 0 ? "+" : ""}${(r * 100).toFixed(1)}%`;

export interface TradeCheckSummaryInput {
  market: TradeCheckMarket;
  side: TradeCheckSide;
  condition: BaseRateRow | null;
  usual: BaseRateRow | null;
}

/**
 * 맨 위 한 줄. 사기 전 = 비용 뒤 오른 비율, 팔기 전 = 하루 더 들고 있었을 때 오른 비율(파는 비용은 같아 비용 전).
 * 조건이 없으면 평소 행으로 말한다 — 지어내지 않고, 빈칸도 아니다.
 */
export const tradeCheckSummary = ({ market, side, condition, usual }: TradeCheckSummaryInput): string => {
  const when = HORIZON_PHRASE[market][SUMMARY_HORIZON];
  const rateOf = (row: BaseRateRow) => (side === "buy" ? row.upRate : row.holdUpRate);
  // 사기 전 = 비용 뒤(국내 수수료 + 거래세 + 반 틱 · 코인 수수료 + 스프레드) — 사람 말로 "빼고도"
  const cost = market === "kr" ? "수수료 · 세금을 빼고도" : "수수료를 빼고도";
  const verb = side === "buy" ? `사서 ${when} ${cost} 오른 경우가` : `더 들고 있었을 때 ${when} 오른 경우가`;

  if (condition) {
    const phrase = CONDITION_PHRASE[condition.conditionId] ?? "비슷한 상황";
    if (condition.status === "below_min") {
      return `${phrase}처럼 비슷한 상황이 아직 ${Math.round(condition.sampleEff)}번뿐이에요 — 숫자로 말하기엔 적어요.`;
    }
    const rate = rateOf(condition);
    if (rate === null) return `${phrase}의 과거 결과를 아직 셀 수 없어요.`;
    let line = `${phrase}, ${verb} 100번 중 ${outOf100(rate)}번이었어요`;
    const usualRate = usual ? rateOf(usual) : null;
    if (side === "buy" && condition.differs && usualRate !== null) {
      line += ` — 평소(${outOf100(usualRate)}번)보다 ${condition.differs === "higher" ? "많아요" : "적어요"}`;
    }
    return `${line}.`;
  }
  const usualRate = usual ? rateOf(usual) : null;
  if (usualRate === null) return "지금은 과거와 견줄 기록이 없어요.";
  return `지금은 따로 볼 만한 상황이 아니에요 — 평소엔 ${verb} 100번 중 ${outOf100(usualRate)}번이었어요.`;
};

/** 펼침 칸 문장 재료 — 최악 10% · 가운데 · 최상 10% */
export const rangePhrase = (q10: number | null, q50: number | null, q90: number | null): string | null =>
  q10 === null || q50 === null || q90 === null ? null : `나쁜 10% ${pct(q10)} · 가운데 ${pct(q50)} · 좋은 10% ${pct(q90)}`;
