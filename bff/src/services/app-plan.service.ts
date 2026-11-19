import { logger } from "../config/logger";
import { backendApi } from "./backend-api.service";
import {
  toCompleteWeeklyPlanViewModel,
  toMonthlySummaryViewModel,
  toPlanSettingsViewModel,
  toWeeklyPlanViewModel,
  type CompleteWeeklyPlanInput,
  type CompleteWeeklyPlanVM,
  type MonthlySummaryVM,
  type PlanSettingsVM,
  type PlanAsset,
  type WeeklyPlanVM,
} from "./plan.viewmodel";

/** 비트코인 로고를 찾는 시세 목록 크기 — 보유 요약 이름 조회와 같은 출처 · 같은 상한 */
const LOGO_LOOKUP_LIMIT = 100;
/** 시세 목록 심볼 → 적립 자산(코스피는 지수라 시세 목록에 없다 — 글자 아이콘) */
const LOGO_SYMBOL: Partial<Record<PlanAsset, string>> = { btc: "BTC" };

/**
 * 서버 `plan` 호출 예산(`BFF-REQ-021` 호출 맵 개정 2026-11-19). 김프 · 성적 · 실패 사례는 `weekly` 한 응답이라 따로 부르지 않는다.
 * 읽기는 서버가 빠진 지난 주를 한 번에 채우는 첫 회차(쓰기)가 있어 화면 조회보다 넉넉히. **쓰기는 재시도 0** — `backendApi` 는 재시도하지 않는다
 */
export const PLAN_READ_TIMEOUT_MS = 1_500;
const PLAN_WRITE_TIMEOUT_MS = 3_000;

/** 로고는 꾸밈이다 — 계획보다 늦게 기다리지 않는다(시세 목록 호출에는 자체 예산이 없다) */
const LOGO_TIMEOUT_MS = 400;
const within = <T>(work: Promise<T>, ms: number): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`logo timeout ${ms}ms`)), ms);
    work.then((v) => (clearTimeout(timer), resolve(v)), (e) => (clearTimeout(timer), reject(e)));
  });

const dataOf = (response: { data?: unknown }): unknown => (response.data as { data?: unknown } | undefined)?.data;

class AppPlanService {
  /**
   * 이번 주 계획 — 금액 · 배수 · 관문 · 3종 · 김프 · 연속 전부 서버 값. 실패는 상태 코드 그대로(화면 블록이 다시 부른다).
   * 로고는 시세 목록과 나란히(`allSettled`) — 못 받으면 아이콘만 글자로, 계획은 그대로. 홈 한 줄은 로고가 필요 없어 끈다
   */
  async getWeekly(token: string, timeout = PLAN_READ_TIMEOUT_MS, withLogos = true): Promise<WeeklyPlanVM> {
    const [plan, market] = await Promise.allSettled([
      backendApi.proxyAuthRequest("GET", "/plan/weekly", token, undefined, { timeout }),
      withLogos ? within(backendApi.getMarketOverview({ page: 1, limit: LOGO_LOOKUP_LIMIT }), LOGO_TIMEOUT_MS) : Promise.resolve(null),
    ]);
    if (plan.status === "rejected") throw plan.reason;
    const logos = new Map<PlanAsset, string>();
    if (market.status === "fulfilled") {
      const items: unknown[] = Array.isArray(market.value?.items) ? market.value.items : [];
      for (const [asset, symbol] of Object.entries(LOGO_SYMBOL) as Array<[PlanAsset, string]>) {
        const row = items.find((i) => String((i as { symbol?: unknown })?.symbol ?? "").toUpperCase() === symbol) as { logoUrl?: unknown } | undefined;
        if (typeof row?.logoUrl === "string" && row.logoUrl) logos.set(asset, row.logoUrl);
      }
    } else {
      logger.warn("적립 자산 로고를 붙이지 못했다 — 글자 아이콘", { reason: (market.reason as Error)?.message });
    }
    return toWeeklyPlanViewModel(dataOf(plan.value), logos);
  }

  /** 이번 주 적립 완료(수동 체크만). 서버 422(`PLAN_*`)는 error middleware 가 코드 · `min` · `max` 그대로 옮긴다 */
  async complete(token: string, input: CompleteWeeklyPlanInput): Promise<CompleteWeeklyPlanVM> {
    const response = await backendApi.proxyAuthRequest("POST", "/plan/weekly/complete", token, input, { timeout: PLAN_WRITE_TIMEOUT_MS });
    return toCompleteWeeklyPlanViewModel(dataOf(response));
  }

  async getSettings(token: string): Promise<PlanSettingsVM> {
    const response = await backendApi.proxyAuthRequest("GET", "/plan/settings", token, undefined, { timeout: PLAN_READ_TIMEOUT_MS });
    return toPlanSettingsViewModel(dataOf(response));
  }

  /** 월 적립액 저장 — 본문은 받은 그대로(밴드 키가 있으면 서버가 422 `PLAN_BAND_READ_ONLY` — 조용히 걸러 성공시키지 않는다, FR-62) */
  async updateSettings(token: string, body: Record<string, unknown>): Promise<PlanSettingsVM> {
    const response = await backendApi.proxyAuthRequest("PATCH", "/plan/settings", token, body, { timeout: PLAN_WRITE_TIMEOUT_MS });
    return toPlanSettingsViewModel(dataOf(response));
  }

  async getMonthlySummary(token: string, month: string | null): Promise<MonthlySummaryVM> {
    const query = month ? `?month=${encodeURIComponent(month)}` : "";
    const response = await backendApi.proxyAuthRequest("GET", `/plan/monthly-summary${query}`, token, undefined, { timeout: PLAN_READ_TIMEOUT_MS });
    return toMonthlySummaryViewModel(dataOf(response));
  }
}

export const appPlanService = new AppPlanService();
