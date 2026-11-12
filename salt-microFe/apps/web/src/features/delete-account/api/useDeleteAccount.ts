"use client";

import { useMutation } from "@tanstack/react-query";

import { apiFetch, readApiError, type ApiError } from "@repo/web-shared/api";
import { INVESTMENTS_BASE_URL } from "@repo/web-shared/config";

/** `DELETE /api/app/me` — 비밀번호 다시 확인 → 서비스마다 → 계정(순서는 BFF, `BFF-REQ-046` FR-7) */
export const DELETE_ACCOUNT_ENDPOINT = "/api/app/me";

export interface DeleteAccountResult {
  /** 서버가 센 지운(비운) 행 수 합 */
  total: number;
}

const deleteAccount = async (password: string): Promise<DeleteAccountResult> => {
  const response = await apiFetch(`${INVESTMENTS_BASE_URL}${DELETE_ACCOUNT_ENDPOINT}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password }),
  });
  if (!response.ok) throw await readApiError(response, "delete account");
  const body = (await response.json()) as { total?: unknown };
  return { total: typeof body.total === "number" ? body.total : 0 };
};

/** 재시도 0 — 다시 누르는 것이 복구다(지우기는 다시 불러도 안전) */
export const useDeleteAccount = () => useMutation<DeleteAccountResult, ApiError, string>({ mutationFn: deleteAccount, retry: 0 });
