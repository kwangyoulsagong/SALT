"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { signInHref } from "@repo/core/auth";

import { ROUTES } from "../../config";

/**
 * 로그인 화면 주소 — 지금 자리로 돌아오게(`FE-REQ-070` FR-6). 서버 · 수화는 경로만, 마운트 뒤 쿼리(`?asset=` · `?symbol=`)까지.
 * 렌더 중에 `window.location` 을 읽지 않는다(`ssr.md` — 수화 갈림). `useSearchParams` 는 정적 페이지 빌드에 Suspense 를 요구해 쓰지 않는다
 */
export const useSignInHref = (): string => {
  const pathname = usePathname() ?? "/";
  const [here, setHere] = useState(pathname);
  useEffect(() => {
    setHere(`${window.location.pathname}${window.location.search}`);
  }, [pathname]);
  return signInHref(ROUTES.login, here);
};
