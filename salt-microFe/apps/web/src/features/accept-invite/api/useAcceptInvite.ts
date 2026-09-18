"use client";

import {
  useMutation,
  useQueryClient,
  type UseMutationResult,
} from "@tanstack/react-query";

import { authQueryKeys } from "@/entities/auth";
import { writeSession } from "@/shared/api";
import { USER_KEY } from "@/shared/config";

import type { AcceptInviteRequest, AcceptInviteResponse } from "../model/types";
import { acceptInviteApi } from "./acceptInviteApi";

/**
 * 초대 수락 = 계정 생성.
 *
 * ## 성공 시 세션을 저장한다
 *
 * 이 응답의 토큰을 저장하지 않으면 **바로 다음 요청인 온보딩 상태 조회가 401** 이다.
 * 계정은 생겼는데 화면은 진행할 수 없는 상태가 된다 (`shared/api/authToken.ts` 가
 * 같은 누락으로 인증 호출이 전부 실패하고 있던 경위를 적어 두었다).
 *
 * 저장 직후 온보딩 상태를 **무효화**한다. 방금 `invite` 단계를 끝냈으므로 화면이 다음
 * 단계를 물어야 한다.
 */
export const useAcceptInvite = (): UseMutationResult<
  AcceptInviteResponse,
  Error,
  AcceptInviteRequest
> => {
  const queryClient = useQueryClient();

  return useMutation<AcceptInviteResponse, Error, AcceptInviteRequest>({
    mutationFn: acceptInviteApi.accept,
    onSuccess: (data) => {
      writeSession(data);
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        // 프라이빗 모드. 세션 토큰이 우선이고 프로필은 `/auth/me` 로 다시 받을 수 있다.
      }
      queryClient.invalidateQueries({
        queryKey: authQueryKeys.onboardingStatus,
      });
    },
  });
};
