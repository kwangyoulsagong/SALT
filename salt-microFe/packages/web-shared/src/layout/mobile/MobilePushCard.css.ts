import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 알림 칸 줄(`FE-REQ-078`) — 이름 · 설명 왼쪽, 토글 오른쪽 끝(데스크톱 `AlertPrefsPanel` 과 같은 배치). 줄 높이는 내용이 정한다(누름 칸 44+) */
export const rows = style({ display: "flex", flexDirection: "column", margin: 0, padding: 0, listStyle: "none" });

export const row = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "12px",
  minHeight: "56px",
  padding: "6px 0",
  selectors: { "& + &": { borderTop: `1px solid ${vars.colors.neutral[100]}` } },
});

export const text = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const label = style({
  fontSize: vars.appType.body.fontSize,
  lineHeight: vars.appType.body.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[800],
});

export const hint = style({
  fontSize: vars.appType.caption.fontSize,
  lineHeight: vars.appType.caption.lineHeight,
  color: vars.colors.neutral[700],
  wordBreak: "keep-all",
});

export const reason = style({
  margin: 0,
  fontSize: vars.appType.desc.fontSize,
  lineHeight: vars.appType.desc.lineHeight,
  color: vars.colors.neutral[700],
  wordBreak: "keep-all",
});

/** 토글 누름 칸 — 그림은 디자인 시스템 그대로(52×32), 누르는 자리만 44 이상으로(`mobile-design.md` §5). 2026-11-21 측정 32 → 44 */
export const toggleHit = style({
  position: "relative",
  selectors: { "&::after": { content: '""', position: "absolute", inset: "-6px -2px" } },
});
