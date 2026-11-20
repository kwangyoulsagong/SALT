import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 1024 이상은 데스크톱 틀(`FE-REQ-060` FR-10 → `screen-desktop.md` §1) — 그 아래는 휴대폰 폭 한 열(`FE-REQ-058` FR-7) */
const DESKTOP = "screen and (min-width: 1024px)";

export const shell = style({
  display: "flex",
  flexDirection: "column",
  minHeight: "100vh",
  background: vars.colors.background.primary,
});

/** 머리 52 — 로고 하나(`screen-desktop.md` §1). 휴대폰 폭은 여백 16 */
export const header = style({
  display: "flex",
  alignItems: "center",
  height: "52px",
  padding: "0 16px",
  flexShrink: 0,
});

/**
 * 본문 — 1024 이상은 앱 zone 과 같은 본문 패널(`AppNavigation` `contentPanel` 과 같은 값: 바깥 여백 12 · 모서리 12 · `#FBFCFD` · 안쪽 1px 선).
 * 공개 zone 은 앱 내비가 없어 이 껍데기가 칠한다 — 그래야 `PageFrame` 사이드 312 · 선이 다른 zone 과 같은 자리에 선다
 */
export const main = style({
  flex: 1,
  display: "flex",
  flexDirection: "column",
  width: "100%",
  minWidth: 0,
  boxSizing: "border-box",
  "@media": {
    [DESKTOP]: {
      width: "auto",
      margin: `0 ${vars.space.md} ${vars.space.md}`,
      borderRadius: vars.radius.medium,
      background: vars.colors.desk.panel,
      boxShadow: `inset 0 0 0 1px ${vars.colors.desk.line}`,
    },
  },
});
