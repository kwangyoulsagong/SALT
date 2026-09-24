import { toUpstreamClientError } from "../utils/error.util";
import { logger } from "../config/logger";
import { retryOnceOnGet } from "../utils/retry.util";
import { backendApi } from "./backend-api.service";
import {
  toRecordedTransaction,
  toRiskBudgetViewModel,
  toSizeCheckViewModel,
  toTradePlanList,
  toTradePlanViewModel,
  type RecordTradeResult,
  type RiskBudgetResult,
  type SizeCheckResult,
  type TradePlanListResult,
  type TradePlanView,
} from "./trade-risk.viewmodel";

/**
 * 서버 사이즈 계산은 단일 SELECT + 산술(p95 < 200ms, FEATURE-009 비기능). 입력마다 부르니 짧게 끊는다.
 * 조회도 같은 예산 — 게이지는 스냅샷 하나를 읽는다.
 */
const SIZE_CHECK_TIMEOUT_MS = 800;
const RISK_READ_TIMEOUT_MS = 800;
/** 쓰기(거래 · 계획 · 예산) — 재시도 0회(중복 생성). 보유 재계산이 거래 수에 비례해 길어질 수 있다 */
const WRITE_TIMEOUT_MS = 3_000;

type BackendEnvelope<T> = { success: boolean; message?: string; data: T };
type Raw = Record<string, unknown>;

const dataOf = (response: { data: unknown }): Raw =>
  ((response.data as BackendEnvelope<Raw>)?.data ?? {}) as Raw;

/** 4xx(검증 실패 · 409 잠금 · 404)와 취소는 그대로 올리고, 나머지는 화면 값 `unavailable` 로 바꾼다 */
const isPassThrough = (error: unknown, signal?: AbortSignal) =>
  Boolean(toUpstreamClientError(error)) || Boolean(signal?.aborted);

export interface RecordTradeInput {
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  fee?: number;
  transactionDate?: string;
  /** 계획(선택). 필드가 하나도 없으면 계획을 만들지 않는다 */
  plan?: { stopPrice?: number; thesis?: string };
}

/**
 * F009 거래 기록 · 계획 · 사이즈 계산 · 리스크 예산 (`BFF-REQ-038`).
 *
 * **계산하지 않는다.** 서버(`SRV-REQ-038`)가 Decimal 로 계산한 값을 모양만 검사해 옮긴다.
 * 조회 · 계산의 5xx · 타임아웃 · 계약 깨짐은 200 `{ status: 'unavailable' }` 이고(카드 단위 격리),
 * 4xx 는 원 status 로 올린다 — 화면이 "손절가가 진입가보다 높아요"(400)와 "잠시 후 다시"(5xx)를 가른다.
 */
export class AppTradeRiskService {
  async sizeCheck(token: string, body: Raw, signal?: AbortSignal): Promise<SizeCheckResult> {
    try {
      const response = await backendApi.proxyAuthRequest("POST", "/coach/size-check", token, body, {
        timeout: SIZE_CHECK_TIMEOUT_MS,
        signal,
      });
      return toSizeCheckViewModel(dataOf(response));
    } catch (error) {
      if (isPassThrough(error, signal)) throw error;
      logger.warn("[trade-risk] size-check unavailable", { reason: (error as Error)?.message });
      return { status: "unavailable" };
    }
  }

  async getRiskBudget(token: string, signal?: AbortSignal): Promise<RiskBudgetResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", "/coach/risk-budget", token, undefined, {
            timeout: RISK_READ_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      return toRiskBudgetViewModel(dataOf(response));
    } catch (error) {
      if (isPassThrough(error, signal)) throw error;
      logger.warn("[trade-risk] risk-budget unavailable", { reason: (error as Error)?.message });
      return { status: "unavailable" };
    }
  }

  /** 예산 저장. 실패는 그대로 올린다 — 저장 실패를 "저장됨"처럼 보이게 하지 않는다 */
  async updateRiskBudget(token: string, body: Raw): Promise<RiskBudgetResult> {
    const response = await backendApi.proxyAuthRequest("PUT", "/coach/risk-budget", token, body, {
      timeout: WRITE_TIMEOUT_MS,
    });
    return toRiskBudgetViewModel(dataOf(response));
  }

  async listPlans(token: string, symbol: string, signal?: AbortSignal): Promise<TradePlanListResult> {
    try {
      const response = await retryOnceOnGet(
        () =>
          backendApi.proxyAuthRequest("GET", `/coach/plans?symbol=${encodeURIComponent(symbol)}`, token, undefined, {
            timeout: RISK_READ_TIMEOUT_MS,
            signal,
          }),
        signal,
      );
      return { status: "ok", plans: toTradePlanList(dataOf(response).plans) };
    } catch (error) {
      if (isPassThrough(error, signal)) throw error;
      logger.warn("[trade-risk] plans unavailable", { reason: (error as Error)?.message });
      return { status: "unavailable" };
    }
  }

  async createPlan(token: string, body: Raw): Promise<TradePlanView> {
    const response = await backendApi.proxyAuthRequest("POST", "/coach/plans", token, body, {
      timeout: WRITE_TIMEOUT_MS,
    });
    return toTradePlanViewModel(dataOf(response));
  }

  async updatePlan(token: string, id: string, body: Raw): Promise<TradePlanView> {
    const response = await backendApi.proxyAuthRequest("PATCH", `/coach/plans/${encodeURIComponent(id)}`, token, body, {
      timeout: WRITE_TIMEOUT_MS,
    });
    return toTradePlanViewModel(dataOf(response));
  }

  /**
   * 거래 1건 + 계획(선택)을 적는다 — 화면 한 번의 "저장".
   *
   * 순서가 있다: 계획은 거래 id 를 들고 만들어져야 거래와 연결된다(서버가 연결 뒤 손절가를 잠근다).
   * **거래가 저장되면 성공이다.** 계획이 실패하면(4xx 포함) 거래는 두고 `plan.status = 'unavailable'` —
   * 화면은 같은 거래 id 로 계획만 다시 저장한다. 거래 실패는 그대로 올린다(보유 부족 400 등).
   */
  async recordTrade(token: string, input: RecordTradeInput): Promise<RecordTradeResult> {
    const txResponse = await backendApi.proxyAuthRequest(
      "POST",
      "/portfolio/transactions",
      token,
      {
        symbol: input.symbol,
        transactionType: input.side,
        quantity: input.quantity,
        price: input.price,
        ...(input.fee !== undefined ? { fee: input.fee } : {}),
        ...(input.transactionDate ? { transactionDate: input.transactionDate } : {}),
      },
      { timeout: WRITE_TIMEOUT_MS },
    );
    const transaction = toRecordedTransaction(dataOf(txResponse));

    const plan = input.plan ?? {};
    const hasPlan = plan.stopPrice !== undefined || (plan.thesis !== undefined && plan.thesis.trim() !== "");
    if (!hasPlan) return { transaction, plan: { status: "none" } };

    try {
      const created = await this.createPlan(token, {
        symbol: transaction.symbol,
        side: transaction.side,
        transactionId: transaction.id,
        ...(plan.stopPrice !== undefined ? { stopPrice: plan.stopPrice } : {}),
        ...(plan.thesis?.trim() ? { thesis: plan.thesis.trim() } : {}),
        // 계획 수량은 싣지 않는다 — 폼이 따로 받지 않는다. 거래 수량을 넣으면 `size_exceeded` 가 늘 거짓이 된다
      });
      return { transaction, plan: { status: "ok", plan: created } };
    } catch (error) {
      logger.warn("[trade-risk] plan save failed after transaction", {
        status: toUpstreamClientError(error)?.status,
        reason: (error as Error)?.message,
      });
      return { transaction, plan: { status: "unavailable" } };
    }
  }
}

export const appTradeRiskService = new AppTradeRiskService();
