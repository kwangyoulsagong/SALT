import type {
  RecordTradeRequest,
  RecordTradeResult,
  SizeCheckRequest,
  SizeCheckResult,
  TradePlanView,
} from "@repo/core/coach";

import { apiFetch, authHeader } from "@/shared/api";
import { INVESTMENTS_BASE_URL } from "@/shared/config";

/** F009 뷰모델 경로(`BFF-REQ-038`). 조회 경로는 `entities/coach` 가 갖고, 쓰기 · 계산은 이 기능이 갖는다 */
const ENDPOINTS = {
  trades: "/api/app/coach/trades",
  sizeCheck: "/api/app/coach/size-check",
  plans: "/api/app/coach/plans",
} as const;

interface Envelope<T> {
  success: boolean;
  data: T;
}

/** status 와 서버 오류 코드를 든다 — 화면은 코드로 문구를 고른다(보유 부족 등) */
export class RecordTransactionApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | null,
  ) {
    super(`record transaction ${status}`);
  }
}

const readCode = async (response: Response): Promise<string | null> => {
  const body = (await response.json().catch(() => null)) as { code?: unknown } | null;
  return typeof body?.code === "string" ? body.code : null;
};

const postJson = async <T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeader() },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) throw new RecordTransactionApiError(response.status, await readCode(response));
  const envelope = (await response.json()) as Envelope<T>;
  return envelope.data;
};

/**
 * 거래 기록 · 사이즈 계산 · 계획 다시 저장 (F009 `FE-REQ-039`).
 *
 * **주문이 아니다.** 사용자가 이미 한 거래를 적는다(수동 입력, 계좌 연동 없음). 금액 · 비율은 전부 서버가 계산한다.
 * 쓰기는 재시도하지 않는다 — 다시 보내면 거래가 두 번 적힌다.
 */
export const recordTransactionApi = {
  /** 거래 1건 + 계획(선택). 계획만 실패하면 거래는 저장된 채 `plan.status = 'unavailable'` */
  record: (body: RecordTradeRequest): Promise<RecordTradeResult> => postJson(ENDPOINTS.trades, body),

  /** 사이즈 계산 — 계산일 뿐 저장하지 않는다. 입력이 바뀌면 이전 요청을 끊는다(`signal`) */
  sizeCheck: (body: SizeCheckRequest, signal?: AbortSignal): Promise<SizeCheckResult> =>
    postJson(ENDPOINTS.sizeCheck, body, signal),

  /** 거래는 저장됐는데 계획만 실패했을 때 — 같은 거래 id 로 계획만 다시 저장한다 */
  savePlan: (body: {
    symbol: string;
    side: "buy" | "sell";
    transactionId: string;
    stopPrice?: number;
    thesis?: string;
  }): Promise<TradePlanView> => postJson(ENDPOINTS.plans, body),
};
