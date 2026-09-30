import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/** 카드 안 빈 상태 — `EmptyState` 기본 위아래 48px 는 화면 단위용이라 카드 안에서는 과하다(2026-09-30 QA) */
export const compactEmpty = style({
  paddingTop: vars.space.lg,
  paddingBottom: vars.space.lg,
});
