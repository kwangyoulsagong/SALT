import type {
  BehaviorMirrorResult,
  CoachGenerationStatus,
  DecisionOutcomeListResult,
  MonthlyReviewResult,
  CoachReportResult,
  SymbolCoachViewModel,
  SymbolEventsResult,
  SymbolPositioningResult,
  RiskBudgetResult,
  SymbolForecastResult,
  TradePlanListResult,
} from "@repo/core/coach";

import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

import { COACH_ENDPOINTS } from "./endpoints";

/** BFF `/api/app/*` 응답 봉투 */
interface AppEnvelope<T> {
  success: boolean;
  data: T;
}

/** 상태 코드를 들고 던진다 — 재시도 판단이 4xx 와 5xx 를 가른다 */
export class CoachApiError extends Error {
  constructor(readonly status: number) {
    super(`coach api ${status}`);
  }
}

/**
 * 조회만 둔다. mutation(해설 · 피드백 · 주문 전 체크)은 `features/{slice}/api` 로 올린다.
 *
 * `axios` 가 아니라 `apiFetch` 다 — 시세 슬라이스의 `axios` 직접 호출은 번들 회귀를 세 번
 * 냈고 `shared/api` 로 올릴 부채다. 새 호출은 처음부터 그 길로 간다.
 */
export const coachApi = {
  /**
   * 종목 판단 (`GET /api/app/ai-coach/detail`). **인증이 필요하다.**
   *
   * `signal` 이 끊기면 BFF 도 서버 요청을 끊는다(`BFF-REQ-026` FR-52). 행을 빠르게
   * 옮기면 React Query 가 이전 쿼리의 signal 을 끊는다 — 그래서 여기서 꼭 넘긴다.
   */
  symbolDetail: async (
    symbol: string,
    signal?: AbortSignal,
  ): Promise<SymbolCoachViewModel> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.symbolDetail(symbol)}`,
      { headers: authHeader(), signal },
    );
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<SymbolCoachViewModel>;
    return body.data;
  },

  /**
   * 코치 리포트 (`GET /api/app/coach/report`). **인증이 필요하다.**
   *
   * 서버 5xx · 타임아웃은 BFF 가 200 `{ status: "unavailable" }` 로 준다 — 그건 에러가 아니라
   * 값이다. 4xx(401 등)만 여기서 던진다(토큰 갱신이 돌아야 한다).
   */
  report: async (signal?: AbortSignal): Promise<CoachReportResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.report}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<CoachReportResult>;
    return body.data;
  },

  /** 생성 상태 (`GET /api/app/coach/generation-status`). 쿨다운 판정은 서버가 했다 */
  generationStatus: async (signal?: AbortSignal): Promise<CoachGenerationStatus> => {
    const response = await apiFetch(
      `${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.generationStatus}`,
      { headers: authHeader(), signal },
    );
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<CoachGenerationStatus>;
    return body.data;
  },

  /**
   * 가격 변동 범위 (`GET /api/app/coach/forecast`). **소유자만** — 아니면 404 를 던진다(`ADR-003`).
   * 서버 장애는 BFF 가 200 `{ status: "unavailable" }` 로 준다.
   */
  forecast: async (symbol: string, signal?: AbortSignal): Promise<SymbolForecastResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.forecast(symbol)}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<SymbolForecastResult>;
    return body.data;
  },

  /** 주요 사건 (`GET /api/app/coach/events`). 소유자만 — 아니면 404. 서버 장애는 200 `unavailable` */
  events: async (symbol: string, signal?: AbortSignal): Promise<SymbolEventsResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.events(symbol)}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<SymbolEventsResult>;
    return body.data;
  },

  /** 쏠림 신호 (`GET /api/app/coach/positioning`). 소유자만 — 아니면 404. 서버 장애는 200 `unavailable` */
  positioning: async (symbol: string, signal?: AbortSignal): Promise<SymbolPositioningResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.positioning(symbol)}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<SymbolPositioningResult>;
    return body.data;
  },

  /**
   * 리스크 예산 게이지 3 · 설정 (`GET /api/app/coach/risk-budget`, F009). 서버 장애는 BFF 가 200
   * `{ status: "unavailable" }` 로 준다 — 게이지 카드만 "불러올 수 없음"이다.
   */
  riskBudget: async (signal?: AbortSignal): Promise<RiskBudgetResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.riskBudget}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<RiskBudgetResult>;
    return body.data;
  },

  /** 종목별 거래 계획 (`GET /api/app/coach/plans`, F009). 최근 순 */
  plans: async (symbol: string, signal?: AbortSignal): Promise<TradePlanListResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.plans(symbol)}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<TradePlanListResult>;
    return body.data;
  },

  /** 내 거래 미러 (`GET /api/app/coach/mirror`, F009 슬라이스 5). 서버 장애는 BFF 가 200 `unavailable` */
  mirror: async (signal?: AbortSignal): Promise<BehaviorMirrorResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.mirror}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<BehaviorMirrorResult>;
    return body.data;
  },

  /** 월간 복기 (`GET /api/app/coach/review/monthly`, F009 슬라이스 6). 서버 장애는 BFF 가 200 `unavailable` */
  monthlyReview: async (month: string | null, signal?: AbortSignal): Promise<MonthlyReviewResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.monthlyReview(month)}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<MonthlyReviewResult>;
    return body.data;
  },

  /** 청산별 결과 · 태그 (`GET /api/app/coach/outcomes`). 최근 청산 순 */
  outcomes: async (limit: number, signal?: AbortSignal): Promise<DecisionOutcomeListResult> => {
    const response = await apiFetch(`${INVESTMENTS_BASE_URL}${COACH_ENDPOINTS.outcomes(limit)}`, {
      headers: authHeader(),
      signal,
    });
    if (!response.ok) throw new CoachApiError(response.status);

    const body = (await response.json()) as AppEnvelope<DecisionOutcomeListResult>;
    return body.data;
  },
};
