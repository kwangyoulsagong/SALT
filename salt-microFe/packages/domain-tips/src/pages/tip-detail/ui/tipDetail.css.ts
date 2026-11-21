import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { card } from "@repo/web-shared/ui/surface.css";

const DESKTOP = "screen and (min-width: 1024px)";

/** 글 한 단 — 문장 · 상자 모두 최대 720(`screen-desktop.md` §2). 틀(`PageFrame`)이 여백 · 사이드를 맡는다 */
export const article = style({ display: "flex", flexDirection: "column", gap: vars.space.lg, width: "100%", maxWidth: "720px", minWidth: 0 });

/** 글 제목 18/700 — 화면 제목 단(`deskType.title`) */
export const title = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
  wordBreak: "keep-all",
});

export const summary = style({ margin: "-8px 0 0", fontSize: "14px", lineHeight: "22px", fontWeight: 500, color: vars.colors.desk.text2, wordBreak: "keep-all" });

export const section = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const sectionTitle = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const disclaimer = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/**
 * 공식 링크 — 이 화면의 주 버튼 하나. 1024 이상 32 · 모서리 8 · 14/600(`screen-desktop.md` §3), 그 아래는 누름 칸 44(휴대폰 폭 공개 글)
 */
export const official = style({
  alignSelf: "flex-start",
  display: "inline-flex",
  alignItems: "center",
  minHeight: "44px",
  padding: "0 16px",
  borderRadius: "8px",
  background: vars.colors.text.primary,
  color: "#FFFFFF",
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  textDecoration: "none",
  ":focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  "@media": { [DESKTOP]: { minHeight: "32px", padding: "0 12px" } },
});

/** 글 카드(`FE-REQ-076` 2단계) — 뒤로 · 제목 · 요약은 판 위, 확인 필요 띠부터 바뀐 것까지 흰 카드 하나. 안의 메타 · 맞혀 보기 · 내 숫자 상자는 선 없는 정보 상자 */
export const body = style([card, { gap: vars.space.lg }]);
