"use client";

import { useEffect } from "react";

import { markMocksReady } from "@/shared/api";

/**
 * MSW 워커 기동 (개발 전용).
 *
 * 이전에는 `_app.tsx` 모듈 최상단에서 `typeof window` 를 봤다. App Router 에서는
 * 그 자리가 서버에서도 평가되므로 브라우저 분기를 모듈 스코프에 두지 않고
 * **클라이언트 잎의 effect** 로 내린다 (`.claude/rules/ssr.md`).
 *
 * `msw/browser` 가 서버 컴파일에서 빠지는 것은 `next.config.js` 의 resolve alias 가 한다.
 * `next/dynamic` 의 `ssr:false` 로는 부족하다 — **dev 서버는 그래도 서버 그래프에 모듈을 넣는다.**
 *
 * ## 기동이 끝났다고 알린다
 *
 * effect 는 화면의 조회보다 늦을 수 있다. 실제로 워커가 붙기 2초 전에 나간 요청 3건이
 * 404 로 떨어져 홈의 두 섹션이 실패 문구로 바뀌었다 (2026-09-18 실측). 그래서 기동이
 * 끝나면 `markMocksReady()` 로 `shared/api` 의 게이트를 연다 — `apiFetch` 가 그때까지 기다린다.
 *
 * **렌더를 막지 않는다.** 막으면 서버 렌더와 클라이언트 첫 렌더의 마크업이 달라진다(`ssr.md`).
 */
const MockServiceWorker = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    void import("../mock/browser")
      .then(({ worker }) => worker.start({ onUnhandledRequest: "bypass" }))
      .catch((error) => {
        console.error("MSW 워커 기동 실패", error);
      })
      // 실패해도 연다. 닫힌 채로 두면 조회가 멈춘 채로 남는다 — 404 를 보는 편이 낫다.
      .finally(markMocksReady);
  }, []);

  return null;
};

export default MockServiceWorker;
