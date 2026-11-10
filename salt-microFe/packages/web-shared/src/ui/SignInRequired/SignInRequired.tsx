"use client";

import type { ReactNode } from "react";

import { SignInGlass } from "@repo/ui/signInGlass";

import { useHasSession } from "../../api";
import { GUEST_GLASS_MESSAGES } from "../../i18n";
import { useSignInHref } from "./useSignInHref";

export interface SignInRequiredProps {
  /** 가려진 칸 이름 — "코치 판단" · "거래 기록" (단추: "로그인하고 {what} 보기") */
  what: string;
  /** 로그인했을 때 그릴 칸 */
  children: ReactNode;
  /** 유리막 아래 흐리게 깔 모양 — 실데이터 0(스켈레톤 · 빈 틀) */
  placeholder?: ReactNode;
  minHeight?: number;
}

/**
 * 사람 · AI 칸 가르개(`FE-REQ-070` FR-7 · `ADR-011`) — 로그인 안 했으면 유리막, 했으면 칸 그대로.
 *
 * 세션을 아직 모를 때(`null` — 서버 · 수화 중)는 **칸을 그린다**: 칸의 조회 훅은 `useHasSession() === true` 일 때만 부르므로
 * 그 사이엔 칸 자신의 대기 모양이 보이고, 로그인한 사람에게 유리막이 잠깐 비치지 않는다. 서버 마크업과 첫 렌더가 같다.
 */
export const SignInRequired = ({ what, children, placeholder, minHeight }: SignInRequiredProps) => {
  const signedIn = useHasSession();
  const href = useSignInHref();
  if (signedIn !== false) return <>{children}</>;
  return (
    <SignInGlass
      actionLabel={GUEST_GLASS_MESSAGES.action(what)}
      description={GUEST_GLASS_MESSAGES.description}
      href={href}
      minHeight={minHeight}
    >
      {placeholder}
    </SignInGlass>
  );
};
