/**
 * 종목 판단 뷰모델 — `GET /api/app/ai-coach/detail` 응답 `data` (`BFF-REQ-024` FR-30~35).
 *
 * 웹 우측 AI 코치 패널 · 상세 분석 페이지 · RN 이 같은 모양을 본다.
 *
 * ## 이 파일은 BFF 타입의 사본이다
 *
 * 원본은 `bff/src/services/symbol-coach.viewmodel.ts` 의 타입 절이다. BFF 는 이 workspace
 * 밖이라 `@repo/core` 를 import 할 수 없다 — 그래서 **두 벌이고, 바꿀 때는 둘을 같이
 * 바꾼다.** 한쪽만 바꾸면 화면이 조용히 깨진다. 모양을 고치는 PR 은 두 파일을 같이 연다.
 *
 * 타입이 강제하는 것:
 * - 판단은 **늘 있다**(`ADR-010` v2, 2026-11-10 — ~~`renderable: false` 분기에 `judgment` 가 없다, `FE-REQ-028` FR-89~~).
 *   부족한 것은 `caveats[]` 꼬리표가 말한다
 * - `confidence` 필드가 없다(D3)
 * - `zone.notPrediction` 이 리터럴 `true` 다
 * - `preflightDefaults` 에 목표가가 없다(B1)
 *
 * 여기에는 import 가 없다(같은 폴더 타입 파일 `performanceClaim` 만 예외). 값도 없다 — 타입만.
 */

import type { PerformanceClaim } from "./performanceClaim";

export type CoachMode = "scalp" | "long_term";

export type JudgmentAction =
  | "review_short_opportunity"
  | "review_accumulation"
  | "wait"
  | "avoid";

/**
 * 판단 옆 꼬리표 — BFF `JudgmentCaveat` 사본(`SRV-REQ-053` FR-2 v2). 판단을 숨기지 않는다.
 * 셋째 묶음(`inputs_missing` · `track_record_unavailable` · `backtest_missing`)은 3종 결함
 */
export type JudgmentCaveat =
  | { reason: "insufficient_history"; have: number; need: number; dailyIndicator: boolean }
  | { reason: "exchange_warning"; cautions: string[]; checkedAt: string | null }
  | { reason: "stale_inputs"; items: Array<{ item: "price" | "technical_indicator"; lastAt: string | null }> }
  | { reason: "live_sample_short"; live: number; min: number; backtest: number }
  | { reason: "inputs_missing"; items: string[] }
  | { reason: "track_record_unavailable" }
  | { reason: "backtest_missing"; live: number; min: number }
  | { reason: "unknown" };

export type JudgmentCaveatReason = JudgmentCaveat["reason"];

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

/** 거래소 투자주의 종류(원문 코드 — BFF 가 이 5종만 통과시킨다) */
export type ExchangeCaution =
  | "PRICE_FLUCTUATIONS"
  | "TRADING_VOLUME_SOARING"
  | "DEPOSIT_AMOUNT_SOARING"
  | "GLOBAL_PRICE_DIFFERENCES"
  | "CONCENTRATION_OF_SMALL_ACCOUNTS";

/** 거래소 표시(F010 슬라이스 6 · `BFF-REQ-039` FR-6). 표시가 없거나 오래됐으면 `null` */
export interface ExchangeFlag {
  /** 투자유의 — 두 모드가 `exchange_warning` 으로 막혀 온다 */
  warning: boolean;
  cautions: ExchangeCaution[];
  fetchedAt: string;
}

export interface FailureCase {
  date: string;
  symbol: string;
  /** 종목 이름 · 로고(F011 슬라이스 7b) — 성적은 유형 전체라 사례가 다른 종목이다. 못 찾았거나 옛 서버면 없음 */
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
  /** 적중률 − 기저율. 후보는 항상 오른다 대비, 피하기는 항상 안 오른다 대비, 관망은 `null` */
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

/** 가격선 근거 — 실현 변동성 배수인지 고정 비율인지(F010 슬라이스 2 · `BFF-REQ-039` FR-4) */
export type PriceBasis = "volatility" | "fixed";

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
       * 가격선 근거(F010 슬라이스 2) — `volatility` = 20일 실현 변동성 배수(손실 제한 −1σ · 1차 익절 +2σ · 추세 +3σ),
       * `fixed` = 변동성이 없어 고정 비율. 없으면 근거 줄을 그리지 않는다
       */
      basis?: PriceBasis;
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
/** 성적이 세는 자산군(F011 FR-61) — 국내 주식 판단은 국내 주식 표본만 */
export type JudgmentAssetClass = "crypto" | "kr_stock";

/** 국내 주식 판단을 여는 이력의 지금 수치(F011 FR-62) */
export interface JudgmentHistory {
  ready: boolean;
  dailyBars: number;
  requiredDailyBars: number;
  dailyIndicator: boolean;
}

/**
 * 모드 하나 — **판단은 늘 있다**(`ADR-010` v2). `failureCases` 가 비는 것은 `caveats` 에 3종 결함이 있을 때뿐.
 */
export interface ModeCoachViewModel {
  assetClass: JudgmentAssetClass;
  judgment: Judgment;
  observations: JudgmentObservation[];
  trackRecord: TrackRecord;
  failureCases: FailureCase[];
  caveats: JudgmentCaveat[];
  /** 국내 주식 이력 수치. 코인은 `null` */
  history: JudgmentHistory | null;
  /**
   * 라벨 등급 — 참고 · 검증됨 · 주의(`FE-REQ-064` FR-1 · BFF `BFF-REQ-052` FR-1). 판단을 숨기지 않는다 — 라벨 무게만.
   * 검증됨은 등록 뒤 라이브 성적이 같은 날 시장보다 나았을 때만(서버가 정한다 — 화면은 문턱을 모른다)
   */
  tier: JudgmentTier;
  tierBasis: JudgmentTierBasis;
  zone: Zone;
}

export type JudgmentTier = "reference" | "verified" | "caution";

export interface JudgmentTierBasis {
  /** 등급을 정한 출처 — 참고면 `null` */
  source: "live" | "backtest_full" | null;
  /** 참고인 이유. 모르는 값은 `not_computed` */
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
  /** 기간 · 표본 · 기준 · 빗나간 수(F009 FR-33). 서버가 옛 버전이면 `null` */
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
  /** 판단을 새로 못 받아 마지막 판단을 보여 줄 때 그 판단을 받은 시각(`BFF-REQ-052` FR-2). 새 판단이면 null */
  staleSince: string | null;
  exchangeFlag: ExchangeFlag | null;
  disclaimer: string;
}

/**
 * 관측 한 줄의 재료(`FE-REQ-064` FR-1) — 서버가 **문턱에 가까운 순**으로 준 관측에서 결측을 빼고 앞의 둘.
 * 고르는 순서는 서버 몫(`judgmentObservations`)이고 여기는 자르기만 한다
 */
export const OBSERVATION_LINE_ITEMS = 2;
export const nearestObservations = (observations: readonly JudgmentObservation[]): JudgmentObservation[] =>
  observations.filter((row) => !row.missing && row.value !== null).slice(0, OBSERVATION_LINE_ITEMS);

/**
 * 근거 수 — 서버 `judgmentCaveats` 의 근거 판정과 같은 셈: 근거 문장(피하기는 위험 신호까지) + 결측 아닌 관측.
 * 문장만 세면 관망(문장 0)이 엔진이 본 값이 있는데도 "근거 0" 으로 보였다(2026-11-11 실화면 — RSI 49.3 이 있는 RSR)
 */
export const judgmentEvidenceCount = (
  judgment: Pick<ModeCoachViewModel["judgment"], "action" | "reasons" | "risks">,
  observations: readonly JudgmentObservation[],
): number =>
  (judgment.action === "avoid" ? judgment.reasons.length + judgment.risks.length : judgment.reasons.length) +
  observations.filter((row) => !row.missing && row.value !== null).length;
