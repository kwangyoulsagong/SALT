"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { coachQueryKeys } from "@/entities/coach";
import {
  portfolioQueryKeys,
  type PositionTransactionVM,
  type TransactionCreateInput,
  type TransactionPatchInput,
  type TransactionPreviewInput,
  type TransactionPreviewVM,
} from "@/entities/portfolio";
import type { ApiError } from "@repo/web-shared/api";

import { ledgerApi } from "./ledgerApi";

/**
 * 거래가 바뀌면 다시 받을 것 — 포지션(개요 · 흐름 · 레이더 · 거래 목록, `positionAll` 한 번) · 홈 보유 요약 ·
 * 코치 쪽 보유 기반 칸(F009 기록 폼이 버리는 것과 같은 묶음 — 같은 사실이 바뀌었다). `FE-REQ-031` FR-83
 */
const useInvalidateLedger = () => {
  const queryClient = useQueryClient();
  return (symbol: string) =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.positionAll }),
      queryClient.invalidateQueries({ queryKey: portfolioQueryKeys.summary }),
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.panel(symbol) }),
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.riskBudget() }),
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.sizeCheckAll() }),
      queryClient.invalidateQueries({ queryKey: coachQueryKeys.mirror() }),
    ]);
};

/** 저장 · 수정 · 삭제 — **재시도 0회 · 낙관적 갱신 0건**(금액이 바뀐다, FR-83). 성공 뒤 서버 값으로 다시 받는다 */
export const useLedgerWrites = () => {
  const invalidate = useInvalidateLedger();
  const create = useMutation<PositionTransactionVM, ApiError, TransactionCreateInput>({
    mutationFn: ledgerApi.create,
    retry: 0,
    onSuccess: (saved) => invalidate(saved.symbol),
  });
  const update = useMutation<PositionTransactionVM, ApiError, { id: string; patch: TransactionPatchInput }>({
    mutationFn: ledgerApi.update,
    retry: 0,
    onSuccess: (saved) => invalidate(saved.symbol),
  });
  const remove = useMutation<{ id: string }, ApiError, { id: string; symbol: string }>({
    mutationFn: ({ id }) => ledgerApi.remove(id),
    retry: 0,
    onSuccess: (_result, { symbol }) => invalidate(symbol),
  });
  return { create, update, remove };
};

/**
 * 미리보기 — 입력이 다 유효할 때만(호출부가 `null` 이면 끈다). 키에 입력이 들어가 바뀔 때마다 새 요청이고 앞 요청은 `signal` 로 끊긴다(FR-81).
 * 재시도 0 — 과매도(400)는 다시 불러도 같은 답이고, 실패면 화면이 "불러올 수 없습니다" 후 저장을 막지 않는다(FR-82)
 */
export const useTransactionPreview = (input: TransactionPreviewInput | null) =>
  useQuery<TransactionPreviewVM, ApiError>({
    queryKey: [...portfolioQueryKeys.positionAll, "preview", input],
    queryFn: ({ signal }) => ledgerApi.preview(input as TransactionPreviewInput, signal),
    enabled: input !== null,
    retry: 0,
    staleTime: 0,
    gcTime: 0,
  });
