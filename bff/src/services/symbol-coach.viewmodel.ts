/**
 * 종목 판단 뷰모델 — **순수 함수** (`BFF-REQ-023` FR-90~99 · `BFF-REQ-024` FR-30~35).
 *
 * 투자 화면 우측 AI 코치 패널과 상세 분석 페이지가 같은 모양을 쓴다. 서버
 * `SymbolCoachView` 를 거의 그대로 싣고, BFF 가 하는 일은 셋뿐이다:
 *
 * 1. **모드 블록을 `renderable` 판별 union 으로 접는다.** 서버는 막힌 판단에도
 *    `judgment` · `trackRecord` 를 싣는다. 여기서 떨어뜨려야 막힌 판단의 점수 · 라벨이
 *    화면에 새어 나갈 길이 타입에서 사라진다(`BFF-REQ-024` FR-31)
 * 2. **계약이 깨진 모드를 `null` 로 막는다.** `renderable` 이 불리언이 아니거나, 렌더
 *    가능한데 3종 세트가 비어 있으면 그 모드는 내보내지 않는다(`BFF-REQ-025` FR-40).
 *    이것은 게이트 판정이 아니다 — **막을 수만 있고 열 수는 없다**
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

export type JudgmentBlockedReason =
  /** 이 자산군에 아직 열지 않은 모드 — 국내 주식 단타(F011 슬라이스 4 · `BFF-REQ-040` FR-17) */
  | "mode_not_open"
  /** 국내 주식 종목의 이력(일봉 120 거래일 · 일봉 지표)이 모자람 — 수치는 `history` */
  | "insufficient_history"
  | "exchange_warning"
  /** 시세 · 지표가 기준보다 오래됐다(F010 슬라이스 7 · `BFF-REQ-039` FR-7). 서버 게이트 값을 그대로 옮긴다 */
  | "stale_inputs"
  | "reasons_missing"
  | "signal_track_record_missing"
  | "failure_cases_missing"
  | "insufficient_sample";

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
  /** 투자유의 — 두 모드가 `exchange_warning` 으로 막힌다 */
  warning: boolean;
  cautions: ExchangeCaution[];
  fetchedAt: string;
}

export interface FailureCase {
  date: string;
  symbol: string;
  /** 성적표 그룹 키 `<mode>.<action>`. 문구가 아니다 */
  event: string;
  outcome: "hit" | "miss";
  /** 관찰 기간 수익률. **과거 값**이다 */
  returnRate: number;
}

export interface TrackRecord {
  signalType: string;
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다 */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  lowSample: boolean;
  horizonHours: number;
  /** 같은 표본에서 "항상 오른다"가 비용을 넘겨 맞은 비율(F010 슬라이스 0) */
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

export type ModeCoachViewModel =
  | {
      renderable: true;
      assetClass: JudgmentAssetClass;
      judgment: Judgment;
      trackRecord: TrackRecord;
      failureCases: [FailureCase, ...FailureCase[]];
      zone: Zone;
    }
  | {
      renderable: false;
      assetClass: JudgmentAssetClass;
      blockedReason: JudgmentBlockedReason;
      /** "표본 N건" 표시용. 성적표가 없으면 `null` */
      trackSample: number | null;
      /** `insufficient_history` 의 수치. 국내 주식만 */
      history: JudgmentHistory | null;
      zone: Zone;
    };

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
  exchangeFlag: ExchangeFlag | null;
  disclaimer: string;
}

/** 서버 모드 블록 (`GetSymbolCoach` `SymbolModeView`). 계약이 깨졌을 수 있어 느슨하게 받는다 */
export interface ServerModeView {
  judgment?: Judgment;
  signalType?: string;
  renderable?: unknown;
  blockedReason?: JudgmentBlockedReason | null;
  trackRecord?: TrackRecord | null;
  failureCases?: FailureCase[];
  zone?: Zone;
  assetClass?: unknown;
  history?: unknown;
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

/**
 * 서버 모드 블록 → 화면 모드 블록. 계약이 깨졌으면 `null`.
 *
 * `renderable` 은 **서버 값만** 본다. 여기서 `true` 가 만들어지는 경로는 없다 —
 * 서버가 `true` 라고 했는데 3종 세트가 비었으면 오히려 `null` 로 막는다(FR-3 · FR-20).
 */
export const toModeViewModel = (
  view: ServerModeView | undefined,
): ModeCoachViewModel | null => {
  if (!view || typeof view.renderable !== "boolean" || !hasZone(view.zone)) {
    return null;
  }

  if (view.renderable === false) {
    if (!view.blockedReason) return null;
    return {
      renderable: false,
      assetClass: toAssetClass(view.assetClass),
      blockedReason: view.blockedReason,
      trackSample: view.trackRecord?.sample ?? null,
      history: toHistory(view.history),
      zone: toZone(view.zone),
    };
  }

  const { judgment, trackRecord, failureCases } = view;
  if (
    !judgment?.scoreNote ||
    !trackRecord ||
    !failureCases ||
    failureCases.length === 0
  ) {
    return null;
  }

  // `confidence` 가 서버에 남아 있어도 여기서 끊긴다 — 필드를 골라 옮긴다(D3)
  return {
    renderable: true,
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
    trackRecord: { ...trackRecord, claim: toPerformanceClaim(trackRecord.claim) },
    failureCases: failureCases as [FailureCase, ...FailureCase[]],
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
 * 투자유의면 서버가 `renderable: true` 를 보냈더라도 막는다 — 계약이 어긋났을 때 **막는 쪽**으로만 고친다.
 * 여기서 `true` 가 만들어지는 경로는 여전히 없다(FR-3)
 */
const blockWarned = (
  mode: ModeCoachViewModel | null,
  flag: ExchangeFlag | null,
): ModeCoachViewModel | null => {
  if (!mode || !flag?.warning || !mode.renderable) return mode;
  return {
    renderable: false,
    assetClass: mode.assetClass,
    blockedReason: "exchange_warning",
    trackSample: mode.trackRecord.sample,
    history: null,
    zone: mode.zone,
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
  const scalp = blockWarned(toModeViewModel(coach.modes?.scalp), exchangeFlag);
  const longTerm = blockWarned(toModeViewModel(coach.modes?.longTerm), exchangeFlag);
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
    exchangeFlag,
    disclaimer: coach.disclaimer,
  };
};
