"use client";

import type { ReactNode } from "react";
import { MotionProvider } from "@repo/ui/motion";

import QueryClientProvider from "./QueryClientProvider";

/**
 * 모든 zone 이 같이 쓰는 프로바이더 — React Query · 모션 (FE-REQ-008 FR-2 → `FE-REQ-053`).
 *
 * zone 마다 store · 쿼리 캐시가 따로다(문서 이동이라 넘어가지 않는다 — `state-convention.md`). 같은 것은
 * **설정**이다: 재시도 판정 · staleTime · 줄인 모션. 셸은 이 위에 Redux · 세션 복원을 얹는다(`apps/web/src/app/providers`).
 *
 * `MotionProvider` — 줄인 모션 존중 · `@repo/ui` 그래픽의 모션 기능 묶음을 여기서 한 번 싣는다(FE-REQ-044 FR-3).
 */
export const ZoneProviders = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider>
    <MotionProvider>{children}</MotionProvider>
  </QueryClientProvider>
);
