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
 * 여기에는 import 가 없다. 그게 이 파일의 조건이다 (`watchlist.viewmodel.ts` 와 같은 이유).
 */

export type CoachMode = "scalp" | "long_term";

export type JudgmentAction =
  | "review_short_opportunity"
  | "review_accumulation"
  | "wait"
  | "avoid";

export type JudgmentBlockedReason =
  | "reasons_missing"
  | "signal_track_record_missing"
  | "failure_cases_missing"
  | "insufficient_sample";

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
  maxDrawdown: number | null;
  lowSample: boolean;
  horizonHours: number;
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
export type ModeCoachViewModel =
  | {
      renderable: true;
      judgment: Judgment;
      trackRecord: TrackRecord;
      failureCases: [FailureCase, ...FailureCase[]];
      zone: Zone;
    }
  | {
      renderable: false;
      blockedReason: JudgmentBlockedReason;
      /** "표본 N건" 표시용. 성적표가 없으면 `null` */
      trackSample: number | null;
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
  lowSample: boolean;
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
      blockedReason: view.blockedReason,
      trackSample: view.trackRecord?.sample ?? null,
      zone: view.zone,
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
    trackRecord,
    failureCases: failureCases as [FailureCase, ...FailureCase[]],
    zone: view.zone,
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
  const scalp = toModeViewModel(coach.modes?.scalp);
  const longTerm = toModeViewModel(coach.modes?.longTerm);
  if (!scalp) degradedFields.push("modes.scalp");
  if (!longTerm) degradedFields.push("modes.longTerm");
  if (!news) degradedFields.push("news");

  const { evidence } = coach;

  return {
    symbol: coach.symbol,
    mode: coach.mode,
    modes: { scalp, longTerm },
    gaugeTrackRecords: coach.gaugeTrackRecords ?? [],
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
    disclaimer: coach.disclaimer,
  };
};
