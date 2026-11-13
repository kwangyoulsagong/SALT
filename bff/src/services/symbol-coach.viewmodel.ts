/**
 * 종목 판단 뷰모델 — **순수 함수** (`BFF-REQ-023` FR-90~99 · `BFF-REQ-024` FR-30~35).
 *
 * 투자 화면 우측 AI 코치 패널과 상세 분석 페이지가 같은 모양을 쓴다. 서버
 * `SymbolCoachView` 를 거의 그대로 싣고, BFF 가 하는 일은 셋뿐이다:
 *
 * 1. **모드 블록은 늘 판단 · 관측 · 성적 · 실패사례 · 꼬리표를 싣는다**(`ADR-010` v2 · `BFF-REQ-052` FR-1, 2026-11-10).
 *    ~~`renderable` 판별 union 으로 접는다(`BFF-REQ-024` FR-31)~~ — 판단은 숨기지 않고, 부족한 것은 서버 `caveats[]` 가 말한다
 * 2. **계약이 깨진 모드를 `null` 로 막는다.** 판단 · 성적 · 실패사례 칸이 없거나, 실패사례가 비었는데 서버가 결함 꼬리표를
 *    붙이지 않았으면 그 모드는 내보내지 않는다(`BFF-REQ-025` FR-40 v2). 판정이 아니다 — **꼬리표를 더할 수만 있고 뺄 수는 없다**
 * 3. 뉴스를 합친다. 실패는 `degradedFields` 로 격리한다(FR-97)
 *
 * 하지 않는 것: `confidence` 옮기기(D3) · "관망" 같은 기본 라벨 · 표본 판정 · 문구 ·
 * `priceGap` 을 % 로 바꾸기(D13) · 목표가 기본값(B1).
 *
 * 여기에는 import 가 없다. 그게 이 파일의 조건이다 (`watchlist.viewmodel.ts` 와 같은 이유). 예외는 import 가 없는 순수
 * 뷰모델 하나(`performance-claim.viewmodel.ts`) — 부작용 모듈을 끌어오지 않는다는 조건은 그대로다.
 */

import { toPerformanceClaim, type PerformanceClaim } from "./performance-claim.viewmodel";

export type CoachMode = "scalp" | "long_term";

export type JudgmentAction =
  | "review_short_opportunity"
  | "review_accumulation"
  | "wait"
  | "avoid";

/**
 * 판단 옆 꼬리표 — 서버 `caveats[]` 그대로(`SRV-REQ-053` FR-2 v2). 판단을 숨기지 않는다.
 * 셋째 묶음(`inputs_missing` · `track_record_unavailable` · `backtest_missing`)은 **3종 결함** — 서버가 셈하고 상태 점검이 본다(`OPS-003`)
 */
export type JudgmentCaveat =
  | { reason: "insufficient_history"; have: number; need: number; dailyIndicator: boolean }
  | { reason: "exchange_warning"; cautions: string[]; checkedAt: string | null }
  | { reason: "stale_inputs"; items: Array<{ item: "price" | "technical_indicator"; lastAt: string | null }> }
  | { reason: "live_sample_short"; live: number; min: number; backtest: number }
  | { reason: "inputs_missing"; items: string[] }
  | { reason: "track_record_unavailable" }
  | { reason: "backtest_missing"; live: number; min: number }
  /** 이 BFF 가 모르는 사유 — 버리지 않고(셈) 화면은 그리지 않는다 */
  | { reason: "unknown" };

export type JudgmentCaveatReason = JudgmentCaveat["reason"];

/** 3종 결함 꼬리표 — 실패사례가 비어도 되는 유일한 경우 */
export const TRIAD_DEFECT_REASONS: readonly JudgmentCaveatReason[] = [
  "inputs_missing",
  "track_record_unavailable",
  "backtest_missing",
];

/** 엔진이 본 값 하나(`ADR-010`) — 서버가 문턱에 가까운 순으로 준다 */
export interface JudgmentObservation {
  item: "change24h" | "sentiment" | "rsi";
  value: number | null;
  lower: number;
  upper: number;
  distance: number | null;
  points: number;
  missing: boolean;
}

/** 업비트 투자주의 종류(원문 코드). 모르는 코드는 BFF 에서 버린다 — 화면이 문구를 지어내지 않게 */
export const EXCHANGE_CAUTIONS = [
  "PRICE_FLUCTUATIONS",
  "TRADING_VOLUME_SOARING",
  "DEPOSIT_AMOUNT_SOARING",
  "GLOBAL_PRICE_DIFFERENCES",
  "CONCENTRATION_OF_SMALL_ACCOUNTS",
] as const;
export type ExchangeCaution = (typeof EXCHANGE_CAUTIONS)[number];

/** 거래소 표시(F010 슬라이스 6 · `BFF-REQ-039` FR-6). 표시가 없거나 오래됐으면 `null` */
export interface ExchangeFlag {
  /** 투자유의 — 두 모드에 `exchange_warning` 꼬리표(판단은 그대로) */
  warning: boolean;
  cautions: ExchangeCaution[];
  fetchedAt: string;
}

export interface FailureCase {
  date: string;
  symbol: string;
  /** 종목 이름 · 로고(F011 슬라이스 7b) — 성적은 유형 전체라 사례가 다른 종목이다. 서버가 못 찾았으면 `null` · 옛 서버면 없음 */
  name?: string | null;
  logoUrl?: string | null;
  /** 성적표 그룹 키 `<mode>.<action>`. 문구가 아니다 */
  event: string;
  outcome: "hit" | "miss";
  /** 관찰 기간 수익률. **과거 값**이다 */
  returnRate: number;
}

export interface TrackRecord {
  signalType: string;
  /**
   * 성적 출처 — `backtest` 면 과거 시세로 되돌려 채점한 **모의** 성적(국내 주식만, 라이브 표본이 모자랄 동안).
   * 화면은 라벨을 붙인다. 둘을 합산한 성적은 없다(F011 슬라이스 7b)
   */
  sampleOrigin: "live" | "backtest";
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다 */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  lowSample: boolean;
  horizonHours: number;
  /** 같은 자산군 · 모드 판단 전체(행동 무관)에서 "항상 오른다"가 비용을 넘겨 맞은 비율(F010 슬라이스 0 · 2026-10-26 풀로 정정) */
  alwaysUpRate: number | null;
  /** 적중률 − 기저율. 관망은 `null` */
  excessWinRate: number | null;
  /** 기간 · 표본 · 기준 · 빗나간 수(F009 FR-33). 서버가 옛 버전이면 `null` */
  claim: PerformanceClaim | null;
}

export interface Judgment {
  action: JudgmentAction;
  label: string;
  score: number;
  scoreNote: string;
  validity: { code: string };
  riskLevel: "medium" | "high";
  headline: string;
  reasons: string[];
  risks: string[];
}

/** 서버 `Zone` 그대로 (`SRV-REQ-025` FR-44). 가격 · 거리는 서버가 낸 값이다 */
export type Zone =
  | {
      kind: "held_rule";
      notPrediction: true;
      currentPrice: number;
      stages: Array<{
        key: "protect_loss" | "first_profit" | "trend_hold";
        price: number;
        priceGap: number;
        ratio: number;
      }>;
      status: string;
      /**
       * 가격선 근거(F010 슬라이스 2 · `BFF-REQ-039` FR-4) — `volatility` = 20일 실현 변동성 배수(−1σ · +2σ · +3σ),
       * `fixed` = 변동성이 없어 고정 비율. 모르는 값이면 필드가 없다
       */
      basis?: "volatility" | "fixed";
    }
  | {
      kind: "observation";
      notPrediction: true;
      currentPrice: number;
      lower: number;
      mid: number;
      upper: number;
      priceGap: { lower: number; mid: number; upper: number };
      ruleCode: string;
      lookback: { timeframe: "m5" | "d1"; days: number };
      sample: number;
    }
  | {
      kind: "unavailable";
      reasonCode: "out_of_scope" | "excluded_asset" | "insufficient_price_history";
    };

/**
 * 모드 하나. **`renderable: false` 에 `judgment` · `trackRecord` 가 없다.**
 * `zone` 은 판단이 막혀도 싣는다 — 구간은 판단이 아니라 과거 가격과 내 규칙이다.
 */
/** 성적이 세는 자산군(F011 FR-61). 서버가 옛 버전이면 코인이다 */
export type JudgmentAssetClass = "crypto" | "kr_stock";

/** 국내 주식 판단을 여는 이력의 지금 수치(F011 FR-62). 코인엔 없다 */
export interface JudgmentHistory {
  ready: boolean;
  dailyBars: number;
  requiredDailyBars: number;
  dailyIndicator: boolean;
}

/**
 * 모드 하나 — **판단은 늘 있다**(`ADR-010` v2). 판별 union 이 아니다(`BFF-REQ-024` FR-31 뒤집힘).
 * `failureCases` 가 비는 것은 `caveats` 에 3종 결함이 있을 때뿐이다(그 밖엔 계약 깨짐 → 모드 `null`).
 * `zone` 은 판단과 별개 — 과거 가격과 내 규칙이다.
 */
export interface ModeCoachViewModel {
  assetClass: JudgmentAssetClass;
  judgment: Judgment;
  observations: JudgmentObservation[];
  trackRecord: TrackRecord;
  failureCases: FailureCase[];
  caveats: JudgmentCaveat[];
  /** 국내 주식 이력 수치. 코인 · 옛 서버는 `null` */
  history: JudgmentHistory | null;
  /**
   * 라벨 등급 — 참고 · 검증됨 · 주의(`BFF-REQ-052` FR-1 · 서버 `SRV-REQ-053` FR-7). 서버 값 그대로, **모르는 값 · 옛 서버면 `reference`**
   * (지어내지 않는다 — 검증됨을 만들 수 있는 것은 서버뿐). 등급은 판단을 숨기지 않는다
   */
  tier: JudgmentTier;
  tierBasis: JudgmentTierBasis;
  zone: Zone;
}

export type JudgmentTier = "reference" | "verified" | "caution";

export interface JudgmentTierBasis {
  /** 등급을 정한 출처 — 참고면 `null` */
  source: "live" | "backtest_full" | null;
  /** 참고인 이유(`no_candidate` · `no_avoid` · `below_effective_n` · `ci_includes_zero` · `regimes_disagree` · `not_computed`). 모르는 값은 `not_computed` */
  reason: string | null;
  liveEffectiveN: number;
  minEffectiveN: number;
  spreadCi: { low: number; high: number } | null;
}

export interface GaugeTrackRecord {
  gauge: "sentiment" | "smart_money";
  bucketCode: string;
  currentValue: number;
  horizonDays: number;
  sample: number;
  p25: number | null;
  median: number | null;
  p75: number | null;
  positiveRate: number | null;
  /** 같은 종목 모든 구간의 오른 비율 — 이 구간과 비교하는 기준(F009 FR-33) */
  baselinePositiveRate: number | null;
  lowSample: boolean;
  claim: PerformanceClaim | null;
}

export interface SymbolNewsItem {
  id: string;
  title: string;
  source: string;
  url: string;
  publishedAt: string;
}

export interface SymbolCoachViewModel {
  symbol: string;
  /** 초기 선택 모드. 서버가 정한다(B16) */
  mode: CoachMode;
  /**
   * 두 모드를 한 응답에 싣는다 — 모드 전환이 BFF 호출을 만들지 않는다(FR-90).
   * **`null` = 서버 계약이 깨져 이 모드를 내보내지 않았다.** `degradedFields` 에 이름이 있다
   */
  modes: { scalp: ModeCoachViewModel | null; longTerm: ModeCoachViewModel | null };
  gaugeTrackRecords: GaugeTrackRecord[];
  evidence: {
    price: number | null;
    change24h: number | null;
    sentiment: { score: number; label: string; calculatedAt: string } | null;
    technical: { rsi: number | null; timestamp: string } | null;
    whale: { buyAmountKRW: number; sellAmountKRW: number; count: number };
    news: SymbolNewsItem[];
  };
  riskGuard: { hasHolding: boolean; holdingWeightLimit: number };
  /** 목표가가 없다(B1) — 주문 전 체크가 목표가를 미리 채우지 않는다 */
  preflightDefaults: { symbol: string; entryPrice: number | null; mode: CoachMode };
  missingData: string[];
  dataFreshness: {
    priceUpdatedAt: string | null;
    sentimentCalculatedAt: string | null;
    indicatorTimestamp: string | null;
    generatedAt: string;
  };
  /** `'news'` · `'modes.scalp'` · `'modes.longTerm'` */
  degradedFields: string[];
  /** 판단을 새로 못 받아 마지막 판단을 줬다면 그 판단을 받은 시각(`BFF-REQ-052` FR-2). 새 판단이면 null */
  staleSince: string | null;
  exchangeFlag: ExchangeFlag | null;
  disclaimer: string;
}

/** 서버 모드 블록 (`GetSymbolCoach` `SymbolModeView`). 계약이 깨졌을 수 있어 느슨하게 받는다 */
export interface ServerModeView {
  judgment?: Judgment;
  signalType?: string;
  observations?: unknown;
  caveats?: unknown;
  trackRecord?: TrackRecord | null;
  failureCases?: FailureCase[];
  zone?: Zone;
  assetClass?: unknown;
  history?: unknown;
  tier?: unknown;
  tierBasis?: unknown;
}

export interface ServerSymbolCoach {
  symbol: string;
  mode: CoachMode;
  modes?: { scalp?: ServerModeView; longTerm?: ServerModeView };
  gaugeTrackRecords?: GaugeTrackRecord[];
  riskGuard: { hasHolding: boolean; holdingWeightLimit: number };
  evidence: Omit<SymbolCoachViewModel["evidence"], "news">;
  missingData?: string[];
  dataFreshness: SymbolCoachViewModel["dataFreshness"];
  exchangeFlag?: { warning?: unknown; cautions?: unknown; fetchedAt?: unknown } | null;
  disclaimer?: string;
}

export interface ServerSymbolNews {
  articles?: Array<SymbolNewsItem & Record<string, unknown>>;
}

/** 면책 문구가 없는 판단은 내보내지 않는다(`BFF-REQ-025` FR-22). */
export class SymbolCoachContractError extends Error {
  constructor(readonly missing: string) {
    super(`symbol coach contract: ${missing} missing`);
  }
}

const hasZone = (zone: Zone | undefined): zone is Zone =>
  typeof zone?.kind === "string";

const PRICE_BASES: readonly unknown[] = ["volatility", "fixed"];

/**
 * 보유 구간의 `basis` 를 아는 값으로만 남긴다. 나머지 구간 모양은 서버 그대로(FR-44). 모르는 근거를 옮기면
 * 화면이 "변동성 기준"을 잘못 말할 수 있다 — 필드를 지운다
 */
const toZone = (zone: Zone): Zone => {
  if (zone.kind !== "held_rule") return zone;
  const { basis, ...rest } = zone;
  return PRICE_BASES.includes(basis) ? zone : rest;
};

const toAssetClass = (value: unknown): JudgmentAssetClass => (value === "kr_stock" ? "kr_stock" : "crypto");

/** 이력 수치 — 모양이 틀리면 `null`(문구가 숫자를 지어내지 않게) */
const toHistory = (value: unknown): JudgmentHistory | null => {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  const count = (v: unknown) => (typeof v === "number" && Number.isInteger(v) && v >= 0 ? v : null);
  const dailyBars = count(raw.dailyBars);
  const requiredDailyBars = count(raw.requiredDailyBars);
  if (dailyBars === null || requiredDailyBars === null || typeof raw.ready !== "boolean") return null;
  return { ready: raw.ready, dailyBars, requiredDailyBars, dailyIndicator: raw.dailyIndicator === true };
};

const KNOWN_CAVEATS: readonly string[] = [
  "insufficient_history",
  "exchange_warning",
  "stale_inputs",
  "live_sample_short",
  "inputs_missing",
  "track_record_unavailable",
  "backtest_missing",
];

/** 꼬리표 배열 — 배열이 아니면 계약 깨짐(`null`). 모르는 사유는 `unknown` 으로 남긴다(셈만, 숫자를 지어내지 않는다) */
export const toCaveats = (value: unknown): JudgmentCaveat[] | null => {
  if (!Array.isArray(value)) return null;
  return value.map((raw) => {
    const reason = (raw as { reason?: unknown } | null)?.reason;
    return typeof reason === "string" && KNOWN_CAVEATS.includes(reason)
      ? (raw as JudgmentCaveat)
      : { reason: "unknown" as const };
  });
};

const OBSERVED_ITEMS: readonly unknown[] = ["change24h", "sentiment", "rsi"];

/** 관측 — 모양이 틀린 행만 버린다(숫자를 고치지 않는다). 없으면(옛 서버) 빈 배열 */
const toObservations = (value: unknown): JudgmentObservation[] =>
  Array.isArray(value)
    ? value.filter(
        (row): row is JudgmentObservation =>
          typeof row === "object" &&
          row !== null &&
          OBSERVED_ITEMS.includes((row as JudgmentObservation).item) &&
          typeof (row as JudgmentObservation).missing === "boolean" &&
          typeof (row as JudgmentObservation).lower === "number" &&
          typeof (row as JudgmentObservation).upper === "number",
      )
    : [];

const TIER_REASONS = ["no_candidate", "no_avoid", "below_effective_n", "ci_includes_zero", "regimes_disagree", "not_computed"];
const VERIFIED_MIN_EFFECTIVE_N = 620;

const unknownTier = (): { tier: JudgmentTier; tierBasis: JudgmentTierBasis } => ({
  tier: "reference",
  tierBasis: { source: null, reason: "not_computed", liveEffectiveN: 0, minEffectiveN: VERIFIED_MIN_EFFECTIVE_N, spreadCi: null },
});

/**
 * 서버 등급 → 화면 등급. 모양이 틀리면 참고(`not_computed`) — 모르는 값을 "검증됨"으로 읽는 길이 없다.
 * 검증됨은 출처가 라이브일 때만 · 주의는 출처가 있을 때만(서버 `toJudgmentTier` 와 같은 불변식 — 한쪽만 바뀌면 여기서 참고로 접힌다)
 */
export const toTier = (tier: unknown, basis: unknown): { tier: JudgmentTier; tierBasis: JudgmentTierBasis } => {
  const b = (basis ?? {}) as Record<string, unknown>;
  const n = b.liveEffectiveN;
  const min = b.minEffectiveN;
  if ((tier !== "reference" && tier !== "verified" && tier !== "caution") || typeof n !== "number" || !Number.isFinite(n)) {
    return unknownTier();
  }
  const source = b.source === "live" || b.source === "backtest_full" ? b.source : null;
  if (tier === "verified" && source !== "live") return unknownTier();
  if (tier === "caution" && source === null) return unknownTier();
  const ci = b.spreadCi as { low?: unknown; high?: unknown } | null | undefined;
  const reason = tier === "reference" ? (typeof b.reason === "string" && TIER_REASONS.includes(b.reason) ? b.reason : "not_computed") : null;
  return {
    tier,
    tierBasis: {
      source: tier === "reference" ? null : source,
      reason,
      liveEffectiveN: n,
      minEffectiveN: typeof min === "number" && min > 0 ? min : VERIFIED_MIN_EFFECTIVE_N,
      spreadCi: ci && typeof ci.low === "number" && typeof ci.high === "number" ? { low: ci.low, high: ci.high } : null,
    },
  };
};

/**
 * 서버 모드 블록 → 화면 모드 블록. 계약이 깨졌으면 `null`.
 *
 * 판단은 서버가 늘 싣는다(`ADR-010` v2). 여기서 판단을 숨기는 경로는 없다 — `null` 은 **모양이 틀린 것**뿐이다:
 * 판단 · `scoreNote` · 성적 · 실패사례 · 꼬리표 배열 · 구간이 없거나, 실패사례가 비었는데 3종 결함 꼬리표가 없을 때.
 */
export const toModeViewModel = (
  view: ServerModeView | undefined,
): ModeCoachViewModel | null => {
  if (!view || !hasZone(view.zone)) return null;
  const caveats = toCaveats(view.caveats);
  const { judgment, trackRecord, failureCases } = view;
  if (!caveats || !judgment?.scoreNote || !trackRecord || !Array.isArray(failureCases)) return null;
  const defect = caveats.some((c) => TRIAD_DEFECT_REASONS.includes(c.reason));
  if (failureCases.length === 0 && !defect) return null;

  // `confidence` 가 서버에 남아 있어도 여기서 끊긴다 — 필드를 골라 옮긴다(D3)
  return {
    assetClass: toAssetClass(view.assetClass),
    judgment: {
      action: judgment.action,
      label: judgment.label,
      score: judgment.score,
      scoreNote: judgment.scoreNote,
      validity: judgment.validity,
      riskLevel: judgment.riskLevel,
      headline: judgment.headline,
      reasons: judgment.reasons,
      risks: judgment.risks,
    },
    observations: toObservations(view.observations),
    trackRecord: {
      ...trackRecord,
      // 모르는 값은 라이브로 읽지 않는다 — 모의 라벨이 빠지는 쪽이 더 위험하다. 서버가 안 주면(옛 버전 = 라이브만) 라이브
      sampleOrigin: trackRecord.sampleOrigin === undefined || trackRecord.sampleOrigin === "live" ? "live" : "backtest",
      claim: toPerformanceClaim(trackRecord.claim),
    },
    failureCases,
    caveats,
    history: toHistory(view.history),
    ...toTier(view.tier, view.tierBasis),
    zone: toZone(view.zone),
  };
};

/** 서버 표시 → 화면 표시. 모양이 틀리면 `null`(표시 없음과 같다 — 서버 게이트는 이미 적용됐다) */
export const toExchangeFlag = (
  flag: ServerSymbolCoach["exchangeFlag"],
): ExchangeFlag | null => {
  if (!flag || typeof flag.warning !== "boolean" || typeof flag.fetchedAt !== "string") {
    return null;
  }
  const raw = Array.isArray(flag.cautions) ? flag.cautions : [];
  const cautions = EXCHANGE_CAUTIONS.filter((c) => raw.includes(c));
  return { warning: flag.warning, cautions, fetchedAt: flag.fetchedAt };
};

/**
 * 투자유의 표시가 있는데 서버 꼬리표에 `exchange_warning` 이 없으면 더한다 — 계약이 어긋났을 때 **꼬리표를 더하는 쪽**으로만 고친다.
 * 판단을 숨기지 않는다(`ADR-010` v2 — 예전엔 판단 블록을 막았다)
 */
const warnCaveat = (
  mode: ModeCoachViewModel | null,
  flag: ExchangeFlag | null,
): ModeCoachViewModel | null => {
  if (!mode || !flag?.warning || mode.caveats.some((c) => c.reason === "exchange_warning")) return mode;
  return {
    ...mode,
    caveats: [{ reason: "exchange_warning", cautions: flag.cautions, checkedAt: flag.fetchedAt }, ...mode.caveats],
  };
};

const toNewsItem = (article: SymbolNewsItem): SymbolNewsItem => ({
  id: article.id,
  title: article.title,
  source: article.source,
  url: article.url,
  publishedAt: article.publishedAt,
});

/**
 * @param news 뉴스 호출 결과. `null` = 실패 — 판단은 그대로 응답하고 `degradedFields` 에 적는다
 */
export const toSymbolCoachViewModel = (
  coach: ServerSymbolCoach,
  news: ServerSymbolNews | null,
): SymbolCoachViewModel => {
  if (!coach.disclaimer) throw new SymbolCoachContractError("disclaimer");

  const degradedFields: string[] = [];
  const exchangeFlag = toExchangeFlag(coach.exchangeFlag);
  const scalp = warnCaveat(toModeViewModel(coach.modes?.scalp), exchangeFlag);
  const longTerm = warnCaveat(toModeViewModel(coach.modes?.longTerm), exchangeFlag);
  if (!scalp) degradedFields.push("modes.scalp");
  if (!longTerm) degradedFields.push("modes.longTerm");
  if (!news) degradedFields.push("news");

  const { evidence } = coach;

  return {
    symbol: coach.symbol,
    mode: coach.mode,
    modes: { scalp, longTerm },
    gaugeTrackRecords: (coach.gaugeTrackRecords ?? []).map((record) => ({
      ...record,
      baselinePositiveRate:
        typeof record.baselinePositiveRate === "number" && Number.isFinite(record.baselinePositiveRate)
          ? record.baselinePositiveRate
          : null,
      claim: toPerformanceClaim(record.claim),
    })),
    evidence: {
      price: evidence.price,
      change24h: evidence.change24h,
      sentiment: evidence.sentiment,
      technical: evidence.technical,
      whale: evidence.whale,
      news: (news?.articles ?? []).map(toNewsItem),
    },
    riskGuard: {
      hasHolding: coach.riskGuard.hasHolding,
      holdingWeightLimit: coach.riskGuard.holdingWeightLimit,
    },
    preflightDefaults: {
      symbol: coach.symbol,
      entryPrice: evidence.price,
      mode: coach.mode,
    },
    missingData: coach.missingData ?? [],
    dataFreshness: coach.dataFreshness,
    degradedFields,
    staleSince: null,
    exchangeFlag,
    disclaimer: coach.disclaimer,
  };
};
