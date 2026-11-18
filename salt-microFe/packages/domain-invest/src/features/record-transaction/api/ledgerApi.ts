import type {
  PositionTransactionVM,
  TransactionCreateInput,
  TransactionPatchInput,
  TransactionPreviewInput,
  TransactionPreviewVM,
} from "@/entities/portfolio";
import { apiFetch, readApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

/** 거래 기록 쓰기 · 미리보기(F006 G절 2단계 · `BFF-REQ-027` FR-80). 목록 조회는 `entities/portfolio` */
const BASE = `${INVESTMENTS_BASE_URL}/api/app/portfolio/transactions`;

const send = async <T>(method: string, url: string, body: unknown, label: string, signal?: AbortSignal): Promise<T> => {
  const response = await apiFetch(url, {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  // 실패는 `ApiError` — 화면은 `code` 로 문구를 고른다(`PORTFOLIO_INSUFFICIENT_QUANTITY` · 404)
  if (!response.ok) throw await readApiError(response, label);
  return ((await response.json()) as { data: T }).data;
};

/**
 * **주문이 아니다** — 이미 한 거래를 적는다(거래소로 나가는 호출 0). 쓰기는 재시도하지 않는다 — 다시 보내면 거래가 두 번 적힌다
 */
export const ledgerApi = {
  /** 쓰지 않는 전후 계산 — 입력이 바뀌면 앞 요청을 끊는다(`signal`) */
  preview: (input: TransactionPreviewInput, signal?: AbortSignal): Promise<TransactionPreviewVM> =>
    send("POST", `${BASE}/preview`, input, "transaction preview", signal),
  create: (input: TransactionCreateInput): Promise<PositionTransactionVM> => send("POST", BASE, input, "transaction create"),
  update: ({ id, patch }: { id: string; patch: TransactionPatchInput }): Promise<PositionTransactionVM> =>
    send("PATCH", `${BASE}/${encodeURIComponent(id)}`, patch, "transaction update"),
  remove: (id: string): Promise<{ id: string }> =>
    send("DELETE", `${BASE}/${encodeURIComponent(id)}`, undefined, "transaction delete"),
};
