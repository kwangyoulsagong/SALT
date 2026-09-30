"use client";

import { LazyMotion, MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

/**
 * 모션 루트 (FE-REQ-044 FR-3).
 *
 * - `reducedMotion="user"` — OS 설정이 줄이기면 이동 · 크기 · 회전은 꺼지고 투명도만 남는다.
 * - `LazyMotion` + `domAnimation` — `@repo/ui` 그래픽은 `m` 으로 쓰고 기능 묶음은 여기서 한 번만 싣는다.
 *   **동적 import 다.** 동기로 넣으면 모든 페이지 첫 로드 JS 가 45 kB 늘었다(예산 40 kB 초과, 2026-09-30 실측).
 *   묶음이 오기 전 그래픽은 마지막 프레임(서버 HTML 그대로)이라 빈칸이 없다.
 *   `layout` · 드래그가 필요해지면 그 화면에서만 `domMax` 를 따로 싣는다.
 */
const loadFeatures = () => import("./motionFeatures").then((module) => module.default);

export const MotionProvider = ({ children }: { children: ReactNode }) => (
  <LazyMotion features={loadFeatures}>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
);
