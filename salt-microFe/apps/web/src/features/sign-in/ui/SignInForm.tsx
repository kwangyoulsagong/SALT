"use client";

import { Banner } from "@repo/ui/banner";
import { Button } from "@repo/ui/button";
import { Text } from "@repo/ui/text";
import { TextField } from "@repo/ui/textField";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { ROUTES } from "@/shared/config";

import { useSignIn } from "../api/useSignIn";
import { SignInError } from "../api/signInApi";
import { SIGN_IN_ERROR_MESSAGES, SIGN_IN_MESSAGES } from "../model/messages";
import { form, inviteRow, submitRow } from "./SignInForm.css";

/**
 * 로그인 폼 (`FE-REQ-011` FR-63).
 *
 * ## 실패를 필드가 아니라 폼 위에 쓴다
 *
 * 서버는 이메일이 없는 것과 비밀번호가 틀린 것을 **구분하지 않는다**(계정 존재 여부 노출).
 * 그래서 어느 필드가 틀렸는지 우리도 모른다 — 비밀번호 칸에 에러를 달면 이메일이 맞다고
 * 말하는 셈이다. 폼 위 한 줄로 둔다.
 *
 * ## 형식 검증을 하지 않는다
 *
 * `type="email"` 의 브라우저 검증만 쓴다. "이메일 형식이 아닙니다"를 우리가 또 판정하면
 * 서버가 받아 줄 값을 프론트가 먼저 거절하는 일이 생긴다.
 */
export const SignInForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { mutate, isPending, error } = useSignIn();

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isPending;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    mutate({ email: email.trim(), password });
  };

  return (
    <form className={form} onSubmit={handleSubmit} noValidate={false}>
      {error ? <Banner tone="error">{messageOf(error)}</Banner> : null}

      <TextField
        label={SIGN_IN_MESSAGES.emailLabel}
        placeholder={SIGN_IN_MESSAGES.emailPlaceholder}
        value={email}
        onChange={setEmail}
        type="email"
        autoComplete="email"
        inputMode="email"
        autoFocus
        required
      />
      <TextField
        label={SIGN_IN_MESSAGES.passwordLabel}
        placeholder={SIGN_IN_MESSAGES.passwordPlaceholder}
        value={password}
        onChange={setPassword}
        type="password"
        autoComplete="current-password"
        required
      />

      <div className={submitRow}>
        <Button type="submit" size="lg" fullWidth disabled={!canSubmit} loading={isPending}>
          {isPending ? SIGN_IN_MESSAGES.submitting : SIGN_IN_MESSAGES.submit}
        </Button>
      </div>

      <div className={inviteRow}>
        <Text variant="caption" color="tertiary">
          {SIGN_IN_MESSAGES.inviteHint}
        </Text>
        <Link href={ROUTES.onboarding}>
          <Text variant="caption" color="brand">
            {SIGN_IN_MESSAGES.inviteAction}
          </Text>
        </Link>
      </div>
    </form>
  );
};

/** 서버 코드 → 문구. 네트워크 실패(코드 없음 · status 0)는 따로 말한다. */
const messageOf = (error: Error): string => {
  if (!(error instanceof SignInError)) return SIGN_IN_MESSAGES.networkError;
  if (error.code && SIGN_IN_ERROR_MESSAGES[error.code]) {
    return SIGN_IN_ERROR_MESSAGES[error.code];
  }
  return SIGN_IN_MESSAGES.unknownError;
};

export default SignInForm;
