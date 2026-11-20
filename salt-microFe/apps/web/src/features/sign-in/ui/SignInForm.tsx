"use client";

import { setUser } from "@/entities/auth";
import { ROUTES } from "@repo/web-shared/config";
import { SignInForm as SharedSignInForm } from "@repo/web-shared/layout/sign-in";
import { useAppDispatch } from "@repo/web-shared/lib";

/**
 * 셸 로그인 폼 — 폼 · 계약 · 세션 저장은 `@repo/web-shared/layout` `SignInForm`(휴대폰 `/m/login` 과 한 벌, `FE-REQ-071` FR-6).
 * 셸만의 일은 Redux `auth` 가지에 사용자를 올리는 것 하나다.
 */
export const SignInForm = () => {
  const dispatch = useAppDispatch();
  return <SharedSignInForm homeHref={ROUTES.home} onSignedIn={(user) => dispatch(setUser(user))} />;
};

export default SignInForm;
