"use client";

import { useQuery } from "@tanstack/react-query";

import { readAccessToken } from "@repo/web-shared/api";

import { homeApi } from "./homeApi";
import { homeQueryKeys } from "./queryKeys";

/** 홈에 돌아올 때마다 다시 받지 않는다 — 목표 추가 · 거래 기록 뒤에는 그 화면에서 문서가 바뀐다 */
const HOME_STALE_TIME_MS = 30_000;

/** 토큰이 없으면 부르지 않는다 — 로그인하지 않은 것은 실패가 아니라 상태다 */
export const useHomeCards = () =>
  useQuery({
    queryKey: homeQueryKeys.cards(),
    queryFn: ({ signal }) => homeApi.cards(signal),
    enabled: Boolean(readAccessToken()),
    staleTime: HOME_STALE_TIME_MS,
  });
