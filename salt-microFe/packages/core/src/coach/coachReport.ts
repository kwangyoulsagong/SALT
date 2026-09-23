/**
 * 코치 리포트 뷰모델 — `GET /api/app/coach/report` 응답 `data` (`BFF-REQ-023` FR-10~14).
 * 생성 상태 — `GET /api/app/coach/generation-status` 응답 `data` (`BFF-REQ-023` FR-61~63).
 *
 * ## 이 파일은 BFF 타입의 사본이다
 *
 * 원본은 `bff/src/services/coach-report.viewmodel.ts` 와 `app-coach-report.service.ts` 의
 * 타입 절이다. `symbolCoach.ts` 와 같은 조건 — **두 벌이고, 바꿀 때는 둘을 같이 바꾼다.**
 *
 * ## 옮기지 않은 필드 하나 — `candidates`
 *
 * BFF 는 후보 목록(행동 · 종목 · 점수)을 싣는다. **이 사본에는 없다.** 후보에는 근거 · 과거
 * 성적 · 실패사례가 붙지 않아 공통 수용 기준 1("하나라도 없으면 렌더하지 않는다")을 어기고,
 * 추천이 막혀도 같은 종목이 후보 1위로 남아 있어 막힌 추천이 새어 나간다. 타입에 없으면
 * 화면이 읽을 길이 없다. 게이트가 붙은 후보 계약이 생기면 그때 옮긴다(`FE-REQ-026` 범위 밖 표).
 *
 * 타입이 강제하는 것:
 * - `renderable: false` 분기에 행동 · 종목 · 점수 · 근거가 **없다**
 * - `failureCases` 가 비지 않은 튜플이다
 *
 * 여기에는 import 가 없다. 값은 폴링 판정 함수 하나다(`readGenerationOutcome`).
 */

export type CoachAction = "buy" | "sell" | "hold" | "rebalance";

export type RecommendationBlockedReason =
  | "reasons_missing"
  | "signal_track_record_missing"
  | "failure_cases_missing";

export interface ReportReason {
  type: string;
  message: string;
  value?: number | string | null;
}

export interface ReportFactor {
  key: string;
  score: number;
  message: string;
}

export interface ReportTrackRecord {
  /** `coach.<action>` */
  signalType: string;
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다 */
  winRate: number | null;
  avgReturn: number | null;
  maxDrawdown: number | null;
  lowSample: boolean;
}

export interface ReportFailureCase {
  date: string;
  event: string;
  outcome: string;
}

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
      /** "표본이 쌓이는 중 (N건)". 성적표가 아예 없으면 `null` */
      trackSample: number | null;
    };

export interface ReportExitPlan {
  symbol: string;
  assetType: string;
  currentPrice: number;
  /** `priceGap` = 가격 − 현재가. 서버 계산 */
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

export interface ReportRisk {
  type: string;
  symbol?: string;
  message: string;
  severity: number;
}

export interface CoachReportViewModel {
  status: "ok";
  generatedAt: string | null;
  /** 서버 시계 기준. 다시 계산하지 않는다(`FE-REQ-027` FR-15) */
  staleHours: number | null;
  regime: string | null;
  /**
   * `null` 은 둘 중 하나다: 아직 생성된 추천이 없다 · 서버 계약이 깨져 막았다
   * (`degradedFields` 에 `recommendation`)
   */
  recommendation: ReportRecommendation | null;
  risks: ReportRisk[];
  exitPlans: ReportExitPlan[];
  behaviorFacts: ReportBehaviorFact[];
  excluded: Array<{ assetType: string; reasonCode: string }>;
  disclaimer: string;
  degradedFields: string[];
}

/** 서버가 부르지 못했거나 계약이 깨졌다. BFF 는 옛 응답을 주지 않는다 */
export interface CoachReportUnavailable {
  status: "unavailable";
}

export type CoachReportResult = CoachReportViewModel | CoachReportUnavailable;

export interface CoachGenerationStatus {
  lastGeneratedAt: string | null;
  /** 마지막 요청(쿨다운 거부 제외). `requestedAt` 은 202 응답의 것과 같은 값이다 */
  lastRequest: {
    requestedAt: string;
    source: "worker" | "manual";
    status: "running" | "succeeded" | "failed";
  } | null;
  inProgress: boolean;
  cooldownSeconds: number;
  /** 0 이면 지금 재생성을 누를 수 있다. 판정은 서버가 했다 */
  retryAfterSeconds: number;
}

/** `POST /api/ai-coach/generate` 202 응답 `data` */
export interface CoachGenerationAccepted {
  requestId: string;
  requestedAt: string;
}

/**
 * 202 뒤 폴링 한 번의 판정. `pending` 이면 계속 본다.
 * `settled` = 진행 중인 생성이 없는데 내 요청의 행이 마지막이 아니다 — 끝난 것은 확실하지만
 * 성공인지는 모른다. 화면은 리포트를 다시 부르고 결과 문구를 붙이지 않는다.
 */
export type GenerationOutcome = "pending" | "succeeded" | "failed" | "settled";

/**
 * 생성 상태 → 내가 보낸 요청이 끝났나 (`FE-REQ-028` FR-21 · FR-23).
 *
 * **내 요청의 행으로 판정한다.** `lastRequest` 는 거부를 뺀 마지막 요청이라, 그 사이 워커가
 * 돌면 워커 행이 온다 — 그 행의 `succeeded` 를 내 요청의 성공으로 읽으면 안 된다. 다른 행이면
 * `inProgress` 만 본다: 아무것도 돌지 않으면 내 요청도 끝났다(`settled`). 이것이 없으면 워커가
 * 끼어든 날마다 최대 횟수(30초)까지 기다린다.
 */
export const readGenerationOutcome = (
  status: CoachGenerationStatus,
  accepted: CoachGenerationAccepted,
): GenerationOutcome => {
  const last = status.lastRequest;
  if (last && last.requestedAt === accepted.requestedAt) {
    if (last.status === "succeeded") return "succeeded";
    if (last.status === "failed") return "failed";
    return "pending";
  }
  return status.inProgress ? "pending" : "settled";
};
