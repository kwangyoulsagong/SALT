import { tokens } from "@repo/tokens";

import { bezier } from "../../Motion/bezier";

const { duration, easing } = tokens.motion;
const ease = bezier(easing.standard);

/** 첫 그리기 드러남 한 장면 길이(ms) — `duration.scene` */
export const REVEAL_MS = duration.scene * 1000;

/**
 * 차트가 처음 그려질 때 그림 칸이 왼쪽부터 드러난다 (FE-REQ-062 FR-7 — 캔버스는 지우는 폭을 줄여 가며 rAF).
 * 지난 시간(ms) → 아직 가려 둘 오른쪽 폭(px). 0 이면 끝 — 그다음부터는 평소처럼 그린다.
 */
export const revealHiddenWidth = (elapsedMs: number, plotWidth: number): number => {
  if (plotWidth <= 0 || elapsedMs >= REVEAL_MS) return 0;
  const progress = ease(Math.max(0, elapsedMs) / REVEAL_MS);
  return Math.max(0, plotWidth * (1 - progress));
};
