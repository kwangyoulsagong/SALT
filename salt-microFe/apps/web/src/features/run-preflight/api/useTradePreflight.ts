"use client";

import type { TradePreflightRequest, TradePreflightView } from "@repo/core/coach";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { preflightKeys } from "./queryKeys";
import { runPreflightApi } from "./runPreflightApi";

/** 같은 입력이면 다시 부르지 않는다 — 시세 신선도 경고(10분)보다 짧게 */
const PREFLIGHT_STALE_TIME_MS = 30_000;

/**
 * 주문 전 체크 결과. **입력이 확정된 뒤에만** 부른다 — `input` 은 호출부가 300ms 디바운스한 값이다.
 * 이전 결과를 새 결과가 올 때까지 둔다(`keepPreviousData`) — 칩을 바꿀 때 줄이 비었다 찼다 하지 않게.
 * 4xx(검증 실패)는 다시 부르지 않는다.
 */
export const useTradePreflight = (input: TradePreflightRequest | null) =>
  useQuery<TradePreflightView, Error>({
    queryKey: input ? preflightKeys.check(input) : [...preflightKeys.all(), "idle"],
    queryFn: ({ signal }) => runPreflightApi.check(input as TradePreflightRequest, signal),
    enabled: input !== null,
    staleTime: PREFLIGHT_STALE_TIME_MS,
    placeholderData: keepPreviousData,
    retry: 0,
  });
