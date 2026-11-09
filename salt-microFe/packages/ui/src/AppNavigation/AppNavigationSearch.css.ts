import { style } from "@vanilla-extract/css";

import { vars } from "../styles/tokens.css";

/**
 * 머리 검색칸(`FE-REQ-067` FR-2 — 참고 국내 증권 앱 웹 실측 2026-11-09): 200×32 · 모서리 8 · 옅은 면 + 1px 같은 색 선 · 안 글자 14/500.
 * 실측 글자색(안 글자 #6B7684 · `/` 키 #8B95A1)은 회색 바탕 + 이 면 위 4.5:1 아래였다(2026-11-09 axe) — 둘 다 회색 700 으로 둔다(`screen-desktop.md` §2)
 */
const SURFACE = "rgba(2, 32, 71, 0.05)";

export const searchBox = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  width: "200px",
  height: "32px",
  padding: `0 ${vars.space.md}`,
  border: `1px solid ${SURFACE}`,
  borderRadius: "8px",
  background: SURFACE,
  color: vars.colors.neutral[700],
  fontFamily: vars.fontFamily.base,
  fontSize: vars.fontSizes.base,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  textAlign: "left",
  textDecoration: "none",
  cursor: "pointer",
  transition: `background-color ${vars.motion.duration.instant} ${vars.motion.easing.enter}`,
  selectors: {
    "&:hover": { background: "rgba(2, 32, 71, 0.08)" },
    "&:focus-visible": { outline: `2px solid ${vars.colors.border.focus}`, outlineOffset: "2px" },
  },
  // 768~1023 은 머리에 칸이 좁다 — 검색칸은 1024 이상에서만(하단 탭 화면에선 `/` 키만 남는다)
  "@media": { "screen and (max-width: 1023px)": { display: "none" } },
});

export const searchKey = style({
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.bold,
});

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
  border: 0,
});
