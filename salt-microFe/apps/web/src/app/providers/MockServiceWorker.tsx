"use client";

import { useEffect } from "react";

/**
 * MSW 워커 기동 (개발 전용).
 *
 * 이전에는 `_app.tsx` 모듈 최상단에서 `typeof window` 를 봤다. App Router 에서는
 * 그 자리가 서버에서도 평가되므로 브라우저 분기를 모듈 스코프에 두지 않고
 * **클라이언트 잎의 effect** 로 내린다 (`.claude/rules/ssr.md`).
 *
 * `msw/browser` 가 서버 컴파일에서 빠지는 것은 `next.config.js` 의 resolve alias 가 한다.
 * `next/dynamic` 의 `ssr:false` 로는 부족하다 — **dev 서버는 그래도 서버 그래프에 모듈을 넣는다.**
 */
const MockServiceWorker = () => {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    void import("@/mock/browser").then(({ worker }) =>
      worker.start({ onUnhandledRequest: "bypass" })
    );
  }, []);

  return null;
};

export default MockServiceWorker;
