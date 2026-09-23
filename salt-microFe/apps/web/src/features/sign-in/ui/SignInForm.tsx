"use client";

import { Banner } from "@repo/ui/banner";
import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";
import { useState, type FormEvent } from "react";

import { useSignIn } from "../api/useSignIn";
import { SignInError } from "../api/signInApi";
import { SIGN_IN_ERROR_MESSAGES, SIGN_IN_MESSAGES } from "../model/messages";
import { fields, form, submitRow } from "./SignInForm.css";

/**
 * 로그인 폼 (`FE-REQ-011` FR-62 · FR-63).
 *
 * ## 라벨을 밖에 두지 않는다
 *
 * 입력이 둘뿐이고 `placeholder` 만으로 무엇을 넣는지 분명하다. 라벨 줄을 두면 카드 안에
 * 글자 줄이 네 개가 되고, 채워진 입력(`variant="filled"`)의 면이 끊긴다.
 * **대신 `aria-label` 로 접근 가능한 이름을 준다** — 스크린리더에는 라벨이 있고 화면에는
 * 없다(`a11y-policy.md` — "label 또는 accessible name").
 *
 * ## 실패를 필드가 아니라 폼 위에 쓴다
 *
 * 서버는 이메일이 없는 것과 비밀번호가 틀린 것을 **구분하지 않는다**(계정 존재 여부 노출).
 * 그래서 어느 필드가 틀렸는지 우리도 모른다 — 비밀번호 칸에 에러를 달면 이메일이 맞다고
 * 말하는 셈이다.
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

/** 서버 코드 → 문구. 네트워크 실패(코드 없음)는 따로 말한다. */
const messageOf = (error: Error): string => {
  if (!(error instanceof SignInError)) return SIGN_IN_MESSAGES.networkError;
  if (error.code && SIGN_IN_ERROR_MESSAGES[error.code]) {
    return SIGN_IN_ERROR_MESSAGES[error.code];
  }
  return SIGN_IN_MESSAGES.unknownError;
};

export default SignInForm;
