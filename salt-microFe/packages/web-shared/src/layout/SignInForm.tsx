"use client";

import { Banner } from "@repo/ui/banner";
import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { SIGN_IN_NEXT_PARAM, safeNextPath } from "@repo/core/auth";

import { isApiError, signInApi, writeSession, type ApiError, type SignInRequest, type SignInResponse, type SignInUser } from "../api";
import { USER_KEY } from "../config";

import { SIGN_IN_ERROR_MESSAGES, SIGN_IN_MESSAGES } from "./messages";

// 입구 `@repo/web-shared/layout/sign-in` 하나로 연다 — 배럴(`layout`)에 두면 데스크톱 zone 다섯의 루트 레이아웃 번들에 폼이 딸려 간다
export { SIGN_IN_MESSAGES };
import { fields, form, submitRow } from "./SignInForm.css";

export interface SignInFormProps {
  /** 로그인 뒤 갈 곳 — 셸 `/home` · 휴대폰 `/m/home`. 같은 zone 안이라 `router.replace` */
  readonly homeHref: string;
  /** 세션 저장 뒤 zone 이 더 할 일(셸은 Redux 사용자) */
  readonly onSignedIn?: (user: SignInUser) => void;
}

/**
 * 로그인 폼 — 셸 `/` 와 휴대폰 `/m/login` 이 같이 쓴다(2026-11-20 `FE-REQ-071` FR-6, 셸 `features/sign-in` 에서 내림).
 * 설치한 iOS 웹앱은 Safari 와 저장소를 나누므로 앱 안에서 다시 로그인한다 — 같은 BFF 계약 · 같은 쿠키(path `/`).
 *
 * - 라벨 줄을 두지 않고 `aria-label` 로 이름을 준다(입력 둘 · `placeholder` 로 분명)
 * - 실패는 폼 위 한 줄 — 서버가 이메일 없음과 비밀번호 틀림을 구분하지 않는다(계정 존재 노출)
 * - 리프레시 토큰까지 저장하고(2026-09-23), 로그인 직후 쿼리를 전부 무효화한다(토큰 없이 401 로 끝난 캐시)
 */
export const SignInForm = ({ homeHref, onSignedIn }: SignInFormProps) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate, isPending, error } = useMutation<SignInResponse, ApiError, SignInRequest>({
    mutationFn: signInApi.signIn,
    // 자격 증명이 틀린 것은 다시 보내도 같다
    retry: false,
    // 쿠키가 심긴 뒤에 이동한다 — 먼저 가면 홈의 첫 호출이 세션 없이 나가 401 이다
    onSuccess: async (data) => {
      await writeSession({ accessToken: data.accessToken, refreshToken: data.refreshToken });
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      } catch {
        // 프라이빗 모드에서는 저장이 던진다 — 이 세션은 그대로 쓴다
      }
      onSignedIn?.(data.user);
      void queryClient.invalidateQueries();
      // 유리막에서 왔으면 그 자리로— 다른 zone 일 수 있어 문서 이동. 우리 경로가 아니면 홈.
      // 주소는 콜백 안에서 읽는다 — `useSearchParams` 는 정적 로그인 페이지 빌드에 Suspense 를 요구한다
      const next = safeNextPath(new URLSearchParams(window.location.search).get(SIGN_IN_NEXT_PARAM));
      if (next) window.location.assign(next);
      else router.replace(homeHref);
    },
  });

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    mutate({ email: email.trim(), password });
  };

  return (
    <form className={form} onSubmit={handleSubmit}>
      {error ? <Banner tone="error">{messageOf(error)}</Banner> : null}

      <div className={fields}>
        <TextField
          variant="filled"
          placeholder={SIGN_IN_MESSAGES.emailPlaceholder}
          aria-label={SIGN_IN_MESSAGES.emailLabel}
          value={email}
          onChange={setEmail}
          type="email"
          autoComplete="email"
          inputMode="email"
          autoFocus
          required
        />
        <TextField
          variant="filled"
          placeholder={SIGN_IN_MESSAGES.passwordPlaceholder}
          aria-label={SIGN_IN_MESSAGES.passwordLabel}
          value={password}
          onChange={setPassword}
          type="password"
          autoComplete="current-password"
          required
        />
      </div>

      <div className={submitRow}>
        <Button type="submit" size="lg" fullWidth disabled={!canSubmit} loading={isPending}>
          {isPending ? SIGN_IN_MESSAGES.submitting : SIGN_IN_MESSAGES.submit}
        </Button>
      </div>
    </form>
  );
};

/** 서버 코드 → 문구. 네트워크 실패(코드 없음)는 따로 말한다 */
const messageOf = (error: Error): string => {
  if (!isApiError(error)) return SIGN_IN_MESSAGES.networkError;
  if (error.code && SIGN_IN_ERROR_MESSAGES[error.code]) return SIGN_IN_ERROR_MESSAGES[error.code];
  return SIGN_IN_MESSAGES.unknownError;
};
