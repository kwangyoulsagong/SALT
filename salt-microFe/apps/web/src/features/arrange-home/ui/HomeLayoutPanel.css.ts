import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 카드 줄 — 알림 패널(`toggle-alerts`)과 같은 줄 높이 44 · 설정 본문 단 13/600 */
export const list = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

export const row = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.md,
  minHeight: "44px",
  fontFamily: vars.fontFamily.base,
});

export const label = style({
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

export const actions = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.xs,
});

/** 패널 설명 — 공용 `panelDescription`(회색 500, 흰 패널 위 3.03:1 AA 미달)은 기존 패널 그대로 두고 새 패널만 2단 글자색(2026-11-06 axe — 알림 패널 설명 줄과 같은 판단) */
export const description = style({
  margin: "-8px 0 0",
  color: "rgba(22, 31, 46, 0.64)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/** 값이 오기 전 자리 — 줄 셋 높이(44 × 3 + 8 × 2) */
export const placeholder = style({ minHeight: "148px" });
