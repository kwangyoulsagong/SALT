import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 거래 기록 폼 — 참고 화면 실측(2026-09-24, 주문 패널 1920px):
 * 라벨 열 약 70px · 라벨 13/500 · 입력 32px(헤어라인) · 단위는 입력 안 오른쪽 · 한 묶음 안 행 간격 8,
 * 묶음 사이 14~16 · 보조 줄 12/400 회색 · 조밀형. 모든 글자는 13px 전후.
 */

/** 전역 `body` 에 글꼴이 없다(기존) — 카드가 토큰 글꼴을 직접 갖는다. 없으면 라벨이 세리프로 떨어진다 */
export const form = style({ display: "flex", flexDirection: "column", gap: "16px", fontFamily: vars.fontFamily.base });

export const head = style({ display: "flex", flexDirection: "column", gap: "4px" });

export const title = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "18px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
});

export const description = style({
  margin: 0,
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
});

export const rows = style({
  display: "grid",
  gridTemplateColumns: "70px minmax(0, 1fr)",
  alignItems: "center",
  columnGap: vars.space.sm,
  rowGap: vars.space.sm,
});

export const label = style({
  color: "rgba(24, 31, 43, 0.77)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/** 입력 + 옆 보조 버튼(현재가) */
export const inputWithAction = style({ display: "flex", gap: "6px", alignItems: "center", minWidth: 0 });

export const unit = style({
  color: "rgba(26, 31, 41, 0.89)",
  fontSize: "13px",
  fontWeight: vars.fontWeights.medium,
});

/** 옅은 회색 면 보조 버튼 — 실측 28h · 모서리 7 · 13/600. 터치 타깃은 세로 여백으로 44 를 채운다 */
export const weakButton = style({
  flexShrink: 0,
  height: "28px",
  padding: "0 10px",
  border: "none",
  borderRadius: "7px",
  background: "rgba(7, 25, 76, 0.04)",
  color: "rgba(26, 31, 41, 0.89)",
  fontSize: "13px",
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.colors.neutral[100] },
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" },
    "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
  },
});

/** 계획 접힘 머리 — 행 하나 높이, 셰브론이 방향을 말한다 */
export const planToggle = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  minHeight: "44px",
  padding: "0 2px",
  border: "none",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  background: "transparent",
  color: vars.colors.text.primary,
  fontSize: "13px",
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px", borderRadius: "6px" },
  },
});

export const chevron = style({
  color: vars.colors.neutral[500],
  transition: `transform ${vars.transitions.fast}`,
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});

export const chevronOpen = style([chevron, { transform: "rotate(180deg)" }]);

export const planBody = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const hint = style({
  margin: 0,
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
});

export const notice = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
  color: vars.colors.text.secondary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

export const errorText = style({
  margin: 0,
  color: vars.colors.status.errorDark,
  fontSize: "12px",
  lineHeight: "18px",
});
