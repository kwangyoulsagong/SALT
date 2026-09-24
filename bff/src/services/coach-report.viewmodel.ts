/**
 * 코치 리포트 뷰모델 — **순수 함수** (`BFF-REQ-023` FR-1~6 · FR-10~14 · FR-30~32 · FR-40).
 *
 * 서버 `GET /api/coach/detail` 이 이미 조립한다. BFF 가 하는 일은 셋뿐이다:
 *
 * 1. **추천을 `renderable` 판별 union 으로 접는다.** 서버는 막힌 추천에도 행동 · 종목 · 점수 ·
 *    근거를 싣는다. 여기서 떨어뜨려야 막힌 추천이 화면에 새어 나갈 길이 타입에서 사라진다.
 *    종목도 뺀다 — "BTC 매도"에서 종목은 추천의 일부다(종목 판단의 막힌 모드는 종목이 화면
 *    맥락이라 남는 것과 다르다)
 * 2. **계약이 깨진 블록을 막는다.** 추천이 `renderable: true` 인데 3종 세트가 비었거나
 *    `scoreNote` 가 없으면 `null` 로 막고 `degradedFields` 에 적는다. 목록 필드가 배열이
 *    아니면 빈 배열 + `degradedFields`. **막을 수만 있고 열 수는 없다** — `true` 를 만드는 경로가 없다
 * 3. 면책 · 제외 사실이 없으면 리포트 전체를 내보내지 않는다(`BFF-REQ-025` FR-22 — 면책은 정책)
 *
 * 하지 않는 것: 게이트 판정 · 표본 임계 · `staleHours` 재계산(FR-14) · 가격 거리 계산(FR-30) ·
 * 조건 코드 · 행동 코드를 문장으로(FR-32 · FR-40) · 기본값 채우기(FR-4 · 5).
 *
 * 여기에는 import 가 없다 (`symbol-coach.viewmodel.ts` 와 같은 조건).
 */

export type CoachAction = "buy" | "sell" | "hold" | "rebalance";

export type RecommendationBlockedReason =
  | "reasons_missing"
  | "signal_track_record_missing"
  | "failure_cases_missing";

export type ReportReason = { type: string; message: string; value?: number | string | null };
export type ReportFactor = { key: string; score: number; message: string };

export interface ReportTrackRecord {
  /** `coach.<action>` */
  signalType: string;
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다 */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  lowSample: boolean;
}

export interface ReportFailureCase {
  date: string;
  event: string;
  outcome: string;
}

/**
 * 추천 블록. **`renderable: false` 에 행동 · 종목 · 점수 · 근거가 없다.**
 * `trackSample` 은 "표본이 쌓이는 중 (N건)" 표시용이다(`SRV-REQ-024` FR-132).
 */
export type ReportRecommendation =
  | {
      renderable: true;
      action: CoachAction;
      symbol: string;
      assetType: "crypto" | "us_stock";
      score: number;
      scoreNote: string;
      reasons: ReportReason[];
      topFactors: ReportFactor[];
      signalTrackRecord: ReportTrackRecord;
      failureCases: [ReportFailureCase, ...ReportFailureCase[]];
      explanation: { text: string; source: "llm" | "rule" };
    }
  | {
      renderable: false;
      blockedReason: RecommendationBlockedReason;
      trackSample: number | null;
    };

export interface ReportExitPlan {
  symbol: string;
  assetType: string;
  currentPrice: number;
  stopLoss: { price: number; priceGap: number };
  firstTakeProfit: { price: number; priceGap: number };
  /** 코드. 문구는 프론트 */
  trendHold: { conditionCode: string };
}

export interface ReportBehaviorFact {
  factCode: string;
  params: Record<string, string | number>;
  amountKrw: number | null;
}

export interface CoachReportViewModel {
  status: "ok";
  generatedAt: string | null;
  /** 서버 시계 기준. 다시 계산하지 않는다(FR-14) */
  staleHours: number | null;
  regime: string | null;
  /**
   * `null` 은 둘 중 하나다: 아직 생성된 추천이 없다(`degradedFields` 에 없음) ·
   * 서버 계약이 깨져 막았다(`degradedFields` 에 `recommendation`)
   */
  recommendation: ReportRecommendation | null;
  risks: Array<{ type: string; symbol?: string; message: string; severity: number }>;
  candidates: Array<{ action: string; symbol: string; score: number; reasons: string[] }>;
  exitPlans: ReportExitPlan[];
  behaviorFacts: ReportBehaviorFact[];
  excluded: Array<{ assetType: string; reasonCode: string }>;
  disclaimer: string;
  degradedFields: string[];
}

/** 서버가 부르지 못했거나 계약이 깨졌다. 캐시한 옛 응답을 주지 않는다(FR-12) */
export interface CoachReportUnavailable {
  status: "unavailable";
}

export type CoachReportResult = CoachReportViewModel | CoachReportUnavailable;

/** 서버 `CoachDetailView` 중 여기서 읽는 것. 모양을 믿지 않는다 — 전부 `unknown` 에서 좁힌다 */
export interface ServerCoachDetail {
  generatedAt?: unknown;
  staleHours?: unknown;
  regime?: unknown;
  recommendation?: unknown;
  risks?: unknown;
  candidates?: unknown;
  exitPlans?: unknown;
  behaviorFacts?: unknown;
  excluded?: unknown;
  disclaimer?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const stringOrNull = (value: unknown): string | null =>
  typeof value === "string" ? value : null;

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const COACH_ACTIONS: CoachAction[] = ["buy", "sell", "hold", "rebalance"];

const BLOCKED_REASONS: RecommendationBlockedReason[] = [
  "reasons_missing",
  "signal_track_record_missing",
  "failure_cases_missing",
];

/**
 * 서버 추천 → 화면 추천. `undefined` 는 "계약이 깨졌다" — 호출부가 `degradedFields` 에 적는다.
 * `null` 은 "추천이 없다"(서버가 `null` 을 줬다).
 */
export const toReportRecommendation = (
  raw: unknown,
): ReportRecommendation | null | undefined => {
  if (raw === null) return null;
  if (!isRecord(raw) || typeof raw.renderable !== "boolean") return undefined;

  const track = isRecord(raw.signalTrackRecord) ? raw.signalTrackRecord : null;

  if (raw.renderable === false) {
    const reason = raw.blockedReason as RecommendationBlockedReason;
    if (!BLOCKED_REASONS.includes(reason)) return undefined;
    return {
      renderable: false,
      blockedReason: reason,
      trackSample: numberOrNull(track?.sample),
    };
  }

  const failureCases = Array.isArray(raw.failureCases) ? raw.failureCases : [];
  const reasons = Array.isArray(raw.reasons) ? raw.reasons : [];
  const explanation = isRecord(raw.explanation) ? raw.explanation : null;
  if (
    typeof raw.scoreNote !== "string" ||
    !raw.scoreNote ||
    !track ||
    typeof track.sample !== "number" ||
    track.sample < 1 ||
    failureCases.length === 0 ||
    reasons.length === 0 ||
    !COACH_ACTIONS.includes(raw.action as CoachAction) ||
    typeof raw.symbol !== "string" ||
    typeof raw.score !== "number" ||
    typeof explanation?.text !== "string"
  ) {
    return undefined;
  }

  // 필드를 골라 옮긴다 — 서버가 무엇을 더 싣든(예: 옛 `confidence`) 여기서 끊긴다
  return {
    renderable: true,
    action: raw.action as CoachAction,
    symbol: raw.symbol,
    assetType: raw.assetType as "crypto" | "us_stock",
    score: raw.score,
    scoreNote: raw.scoreNote,
    reasons: reasons as ReportReason[],
    topFactors: (Array.isArray(raw.topFactors) ? raw.topFactors : []) as ReportFactor[],
    signalTrackRecord: {
      signalType: String(track.signalType),
      sample: track.sample,
      winRate: numberOrNull(track.winRate),
      avgReturn: numberOrNull(track.avgReturn),
      worstObservedReturn: numberOrNull(track.worstObservedReturn),
      lowSample: track.lowSample === true,
    },
    failureCases: failureCases as [ReportFailureCase, ...ReportFailureCase[]],
    explanation: {
      text: explanation.text,
      source: explanation.source === "llm" ? "llm" : "rule",
    },
  };
};

/**
 * 서버 코치 상세 → 리포트. 면책 · 제외 사실이 없으면 `unavailable`.
 */
export const toCoachReportViewModel = (
  detail: ServerCoachDetail,
): CoachReportResult => {
  if (typeof detail.disclaimer !== "string" || !detail.disclaimer) {
    return { status: "unavailable" };
  }
  if (!Array.isArray(detail.excluded)) return { status: "unavailable" };

  const degradedFields: string[] = [];

  const list = <T>(name: string, value: unknown): T[] => {
    if (Array.isArray(value)) return value as T[];
    degradedFields.push(name);
    return [];
  };

  const recommendation = toReportRecommendation(detail.recommendation);
  if (recommendation === undefined) degradedFields.push("recommendation");

  return {
    status: "ok",
    generatedAt: stringOrNull(detail.generatedAt),
    staleHours: numberOrNull(detail.staleHours),
    regime: stringOrNull(detail.regime),
    recommendation: recommendation ?? null,
    risks: list("risks", detail.risks),
    candidates: list("candidates", detail.candidates),
    exitPlans: list("exitPlans", detail.exitPlans),
    behaviorFacts: list("behaviorFacts", detail.behaviorFacts),
    excluded: detail.excluded as CoachReportViewModel["excluded"],
    disclaimer: detail.disclaimer,
    degradedFields,
  };
};
