"use client";

import type { SizeCheckRequest, SizeCheckResult } from "@repo/core/coach";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { coachQueryKeys } from "@/entities/coach";

import { recordTransactionApi } from "./recordTransactionApi";

/** 같은 입력이면 다시 부르지 않는다 — 계산은 입력의 순수 함수다(시세 · 예산이 바뀌면 저장 뒤 무효화) */
const SIZE_CHECK_STALE_TIME_MS = 30_000;

/** 입력별 계산 키. 접두사는 `coachQueryKeys.sizeCheckAll` — 거래 · 예산 저장 뒤 전부 버린다 */
const sizeCheckKey = (input: SizeCheckRequest) =>
  [...coachQueryKeys.sizeCheckAll(), input.symbol, input.side, input.quantity, input.price, input.stopPrice ?? null] as const;

/**
 * 사이즈 계산 결과 (F009 FR-4~7). **입력이 확정된 뒤에만** 부른다 — `input` 은 호출부가 300ms 디바운스한 값이다.
 * 이전 결과를 새 결과가 올 때까지 둔다(`keepPreviousData`) — 줄이 비었다 찼다 하지 않게.
 * 4xx(검증 실패)는 다시 부르지 않는다.
 */
export const useSizeCheck = (input: SizeCheckRequest | null) =>
  useQuery<SizeCheckResult, Error>({
    queryKey: input ? sizeCheckKey(input) : [...coachQueryKeys.sizeCheckAll(), "idle"],
    queryFn: ({ signal }) => recordTransactionApi.sizeCheck(input as SizeCheckRequest, signal),
    enabled: input !== null,
    staleTime: SIZE_CHECK_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    retry: 0,
  });
