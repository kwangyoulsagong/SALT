import { toUpstreamClientError } from "../utils/error.util";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import { toEventsViewModel, type EventsResult } from "./events.viewmodel";
import { toPositioningViewModel, type PositioningResult } from "./positioning.viewmodel";
import { toScenarioViewModel, type ScenarioResult } from "./scenario.viewmodel";

/** 서버는 뷰 하나를 읽는다(실측 5ms) — 코치 리포트와 같은 800ms · 재시도 1회 */
const FORECAST_TIMEOUT_MS = 800;

type BackendEnvelope<T> = { success: boolean; message?: string; data: T };

/**
 * 소유자 전용 코치 조회 — 시나리오 · 주요 사건 · 쏠림 (F008 `BFF-REQ-037` · F017 `BFF-REQ-052`). 주간 변동 범위(`/coach/forecast`)는
 * 2026-11-12 삭제 — 화면 소비처가 0이 됐다(시나리오 카드로 교체).
 *
 * - 서버 **4xx 는 그대로 올린다.** 특히 **404 = 소유자가 아니다**(`ADR-003` "응답에 없다") —
 *   `unavailable` 로 바꾸면 화면이 "잠시 후 다시"를 그리게 되고, 그건 비소유자에게 기능의 존재를 알린다
 * - 5xx · 타임아웃 · 계약 깨짐은 200 `{ status: 'unavailable' }`
 */
export class AppForecastService {
  /**
   * 시나리오 카드 — 단타 방향 확률(F017 v2 단계 5 · `BFF-REQ-052` FR-4). 같은 규칙: 4xx(404 = 소유자 아님) 그대로,
   * 5xx · 타임아웃 · 모양 깨짐은 200 `unavailable`. 서버는 뷰 두 개를 읽는다
   */
  async getScenario(token: string, symbol: string, signal?: AbortSignal): Promise<ScenarioResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", `/coach/scenario?symbol=${encodeURIComponent(symbol)}`, token, undefined, {
            timeout: FORECAST_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      return toScenarioViewModel((response.data as BackendEnvelope<unknown>).data);
    } catch (error) {
      if (toUpstreamClientError(error) || signal?.aborted) throw error;
      return { status: "unavailable" };
    }
  }

  /**
   * 주요 사건(거시 일정) · 과거 반응 — `BFF-REQ-037` FR-8. 같은 규칙: 4xx(404 = 소유자 아님) 그대로,
   * 5xx · 타임아웃 · 계약 깨짐은 200 `unavailable`.
   */
  async getEvents(token: string, symbol: string, signal?: AbortSignal): Promise<EventsResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", `/coach/events?symbol=${encodeURIComponent(symbol)}`, token, undefined, {
            timeout: FORECAST_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      const data = (response.data as BackendEnvelope<Record<string, unknown>>).data;
      return toEventsViewModel(data ?? {});
    } catch (error) {
      if (toUpstreamClientError(error) || signal?.aborted) throw error;
      return { status: "unavailable" };
    }
  }

  /** 쏠림 신호(펀딩비 · 김치 프리미엄) · 과거 반응 — `BFF-REQ-037` FR-9. 주요 사건과 같은 규칙 */
  async getPositioning(token: string, symbol: string, signal?: AbortSignal): Promise<PositioningResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", `/coach/positioning?symbol=${encodeURIComponent(symbol)}`, token, undefined, {
            timeout: FORECAST_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      const data = (response.data as BackendEnvelope<Record<string, unknown>>).data;
      return toPositioningViewModel(data ?? {});
    } catch (error) {
      if (toUpstreamClientError(error) || signal?.aborted) throw error;
      return { status: "unavailable" };
    }
  }
}

export const appForecastService = new AppForecastService();
