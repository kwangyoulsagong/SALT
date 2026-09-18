"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { authQueryKeys } from "@/entities/auth";

import { MIN_CHECKABLE_CODE_LENGTH } from "../model/inviteCode";
import type { InviteCheckResponse } from "../model/types";
import { acceptInviteApi } from "./acceptInviteApi";

/**
 * 입력 중 코드 확인 (`FE-REQ-010` FR-23).
 *
 * ## 요청을 아끼는 장치가 셋이다
 *
 * 1. **길이 게이트** — 여섯 글자 미만이면 부르지 않는다. 한 글자마다 부르면 무인증
 *    경로의 요청 제한(창당 30회)에 정상 입력이 먼저 걸린다
 * 2. **디바운스** — 부르는 쪽(`InviteCodeForm`)이 입력을 멈춘 뒤 값을 넘긴다
 * 3. **코드별 캐시 키** — 지웠다 다시 친 코드는 같은 결과를 재사용한다
 *
 * `retry: false` 인 이유: 실패가 대부분 429(요청 제한)이고, 재시도는 그것을 악화시킨다.
 */
const INVITE_CHECK_STALE_TIME_MS = 60_000;

export const useInviteCheck = (
  code: string,
): UseQueryResult<InviteCheckResponse> =>
  useQuery({
    queryKey: [...authQueryKeys.inviteCheck, code],
    queryFn: () => acceptInviteApi.check(code),
    enabled: code.length >= MIN_CHECKABLE_CODE_LENGTH,
    staleTime: INVITE_CHECK_STALE_TIME_MS,
    retry: false,
  });
