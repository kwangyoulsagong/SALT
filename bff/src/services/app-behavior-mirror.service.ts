import { toUpstreamClientError } from "../utils/error.util";
import { logger } from "../config/logger";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import {
  toBehaviorMirrorViewModel,
  toDecisionOutcomeList,
  toDecisionOutcomeViewModel,
  type BehaviorMirrorResult,
  type DecisionOutcomeListResult,
  type DecisionOutcomeView,
} from "./behavior-mirror.viewmodel";

/**
 * 서버 미러는 요청 때 센다(거래 · 계획 · 일봉 · 결과 · 보유 쿼리 5개, 로컬 14ms). 리포트 섹션 하나라 게이지(800ms)보다
 * 여유를 두되, 리포트 LCP 를 붙잡지 않게 짧게 끊는다.
 */
const MIRROR_READ_TIMEOUT_MS = 1_500;
const OUTCOME_READ_TIMEOUT_MS = 1_500;
/** 태그 확정 — 재시도 0회. 실패는 그대로 올린다 */
const WRITE_TIMEOUT_MS = 3_000;

type BackendEnvelope<T> = { success: boolean; message?: string; data: T };
type Raw = Record<string, unknown>;

const dataOf = (response: { data: unknown }): Raw =>
  ((response.data as BackendEnvelope<Raw>)?.data ?? {}) as Raw;

/** 4xx 와 취소는 그대로 올리고, 나머지(5xx · 타임아웃 · 계약 깨짐)는 화면 값 `unavailable` 로 바꾼다 */
const isPassThrough = (error: unknown, signal?: AbortSignal) =>
  Boolean(toUpstreamClientError(error)) || Boolean(signal?.aborted);

/**
 * F009 슬라이스 5 — 내 거래 미러 · 결정 결과 · 태그 확정 (`BFF-REQ-038` FR-7~9).
 *
 * **계산하지 않는다.** 준수율 · 처분효과 · 보유 대비 · 태그 비용 · 엣지 없음 판정은 서버(`SRV-REQ-038` FR-9) 몫이다.
 * 미러는 리포트의 한 섹션이라 따로 부르고 따로 실패한다(카드 단위 격리).
 */
export class AppBehaviorMirrorService {
  async getMirror(token: string, signal?: AbortSignal): Promise<BehaviorMirrorResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", "/coach/mirror", token, undefined, {
            timeout: MIRROR_READ_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      return toBehaviorMirrorViewModel(dataOf(response));
    } catch (error) {
      if (isPassThrough(error, signal)) throw error;
      logger.warn("[behavior-mirror] mirror unavailable", { reason: (error as Error)?.message });
      return { status: "unavailable" };
    }
  }

  async listOutcomes(token: string, limit: number | undefined, signal?: AbortSignal): Promise<DecisionOutcomeListResult> {
    const query = limit === undefined ? "" : `?limit=${limit}`;
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", `/coach/outcomes${query}`, token, undefined, {
            timeout: OUTCOME_READ_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      return { status: "ok", outcomes: toDecisionOutcomeList(dataOf(response).outcomes) };
    } catch (error) {
      if (isPassThrough(error, signal)) throw error;
      logger.warn("[behavior-mirror] outcomes unavailable", { reason: (error as Error)?.message });
      return { status: "unavailable" };
    }
  }

  /** 태그 확정. 실패는 그대로 올린다 — 저장 실패를 "저장됨"처럼 보이게 하지 않는다 */
  async confirmOutcomeTags(token: string, id: string, tags: string[]): Promise<DecisionOutcomeView> {
    const response = await backendApi.proxyAuthRequest(
      "PUT",
      `/coach/outcomes/${encodeURIComponent(id)}/tags`,
      token,
      { tags },
      { timeout: WRITE_TIMEOUT_MS },
    );
    return toDecisionOutcomeViewModel(dataOf(response));
  }
}

export const appBehaviorMirrorService = new AppBehaviorMirrorService();
