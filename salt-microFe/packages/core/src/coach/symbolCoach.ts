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
 * - `renderable: false` 분기에 `judgment` · `trackRecord` 가 **없다** — 막힌 판단의 점수 ·
 *   라벨에 접근하면 컴파일이 실패한다(`FE-REQ-028` FR-89)
 * - `confidence` 필드가 없다(D3)
 * - `zone.notPrediction` 이 리터럴 `true` 다
 * - `preflightDefaults` 에 목표가가 없다(B1)
 *
 * 여기에는 import 가 없다. 값도 없다 — 타입만.
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
  worstObservedReturn: number | null;
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
