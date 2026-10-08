import { logger } from "../config/logger";
import { toUpstreamClientError } from "../utils/error.util";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import {
  KrContractError,
  toKrChartVM,
  toKrDetailVM,
  toKrMarketStatusVM,
  toKrOverviewVM,
  toKrSearchVM,
  type KrChartPeriod,
  type KrListOrder,
  type KrListPeriod,
  type KrListSort,
} from "./kr-stock.viewmodel";

/**
 * 서버는 저장값만 읽는다(시장표 p95 < 80ms 목표, KIS 동기 호출 0건 — `SRV-REQ-040`). 코치 리포트 · 전망과 같은
 * 800ms · 재시도 1회. 차트는 봉 500개까지라 조금 더 준다
 */
const KR_READ_TIMEOUT_MS = 800;
const KR_CHART_TIMEOUT_MS = 1_500;

/** 서버가 KIS 키 없이 기동했다 — `503 KR_STOCK_DISABLED`(서버 `KrStockDisabledError`) */
const DISABLED_CODE = "KR_STOCK_DISABLED";

export type KrResult<T> = ({ status: "ok" } & T) | { status: "disabled" } | { status: "unavailable" };

const DISABLED = Symbol("kr_stock_disabled");

const isDisabled = (error: unknown) => {
  const response = (error as { response?: { status?: number; data?: { code?: unknown } } })?.response;
  return response?.status === 503 && response.data?.code === DISABLED_CODE;
};

/**
 * 국내 주식 조회 (F011 슬라이스 2 · `BFF-REQ-040`). 서버 `/api/market/kr/*` ↔ BFF `/api/app/market/kr/*`.
 *
 * 응답 규칙 — 화면 블록마다 따로 부르고 따로 실패한다:
 * - **4xx 는 그대로 올린다.** 특히 **404 `KR_STOCK_NOT_AVAILABLE` = 소유자가 아니다**(또는 수집 밖 종목). `unavailable`
 *   로 바꾸면 화면이 "잠시 후 다시"를 그려 비소유자에게 국내 주식이 있다는 사실을 알린다(`ADR-003` 전망과 같은 규칙)
 * - **503 `KR_STOCK_DISABLED` → 200 `{ status: 'disabled' }`.** 화면은 탭을 숨긴다(F011 UX Empty). 고장이 아니라 꺼진 상태라
 *   다시 시도하지 않는다 — 재시도 래퍼보다 먼저 값으로 바꾼다
 * - 그 밖의 5xx · 타임아웃 · 계약 깨짐 → 200 `{ status: 'unavailable' }`(다시 시도)
 *
 * **BFF 캐시를 두지 않는다.** 기획(F011 §BFF)의 "정규장 1s · 그 외 60s" 를 버렸다 — 응답이 소유자 판정에 걸려 있어
 * 공유 캐시는 비소유자에게 새고, 토큰별 캐시는 사용자 ≤10명에서 히트가 없다. 서버가 이미 저장값을 80ms 안에 주고
 * 실시간 값은 WS 가 준다(`performance-bff.md` §4 시장 개요와 같은 판단).
 */
export class AppKrStockService {
  private async read<T>(
    label: string,
    path: string,
    token: string,
    toVM: (data: unknown) => T,
    options: { timeout: number; signal?: AbortSignal },
  ): Promise<KrResult<T>> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi
            .proxyAuthRequest("GET", path, token, undefined, options)
            .catch((error: unknown) => {
              if (isDisabled(error)) return DISABLED;
              throw error;
            }),
        options.signal,
      );
      if (typeof response === "symbol") return { status: "disabled" };
      return { status: "ok", ...toVM((response.data as { data?: unknown })?.data) };
    } catch (error) {
      if (toUpstreamClientError(error) || options.signal?.aborted) throw error;
      logger.warn(`[kr-stock] ${label} unavailable`, {
        reason: error instanceof KrContractError ? error.message : (error as Error)?.message,
      });
      return { status: "unavailable" };
    }
  }

  /** 장 상태 + KIS 상태 — 표 머리 줄. 탭을 그릴지(`disabled`)도 이것으로 정한다 */
  getSession(token: string, signal?: AbortSignal) {
    return this.read("session", "/market/kr/session", token, toKrMarketStatusVM, { timeout: KR_READ_TIMEOUT_MS, signal });
  }

  /** 시세 표(페이지) — 정렬 · 순서 · 기간은 코인 표와 같은 문자열을 그대로 넘긴다(검증은 컨트롤러가 했다) */
  getOverview(
    token: string,
    query: { limit: number; offset: number; sort?: KrListSort; order?: KrListOrder; period?: KrListPeriod },
    signal?: AbortSignal,
  ) {
    const filters =
      `&sort=${encodeURIComponent(query.sort ?? "")}` +
      `&order=${encodeURIComponent(query.order ?? "")}` +
      `&period=${encodeURIComponent(query.period ?? "")}`;
    return this.read(
      "overview",
      `/market/kr/assets?limit=${query.limit}&offset=${query.offset}${filters}`,
      token,
      toKrOverviewVM,
      { timeout: KR_READ_TIMEOUT_MS, signal },
    );
  }

  /** 종목 검색 — 관심 종목 · 거래 기록 폼(마스터 전체) */
  search(token: string, q: string, signal?: AbortSignal) {
    return this.read("search", `/market/kr/search?q=${encodeURIComponent(q)}`, token, toKrSearchVM, {
      timeout: KR_READ_TIMEOUT_MS,
      signal,
    });
  }

  /** 상세 머리 — 현재가 · 상하한 · 투자 지표 · 호가 단위 */
  getDetail(token: string, code: string, signal?: AbortSignal) {
    return this.read("detail", `/market/kr/${encodeURIComponent(code)}`, token, toKrDetailVM, {
      timeout: KR_READ_TIMEOUT_MS,
      signal,
    });
  }

  getChart(token: string, code: string, query: { period: KrChartPeriod; count: number }, signal?: AbortSignal) {
    return this.read(
      "chart",
      `/market/kr/${encodeURIComponent(code)}/chart?period=${query.period}&count=${query.count}`,
      token,
      toKrChartVM,
      { timeout: KR_CHART_TIMEOUT_MS, signal },
    );
  }
}

export const appKrStockService = new AppKrStockService();
