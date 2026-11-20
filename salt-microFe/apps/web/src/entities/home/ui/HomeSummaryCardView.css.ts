import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 홈 요약 카드(`FE-REQ-048` FR-8 · 리서치 `2026-11-19-home-desktop.md`) — 아이콘 + 제목 14/600 + 셰브론 · 주인공 값 18/700 · 보조 값 한 줄 · 노트 12/500.
 * 카드 전체가 링크. 폭은 격자가 정한다(최대 560 — 패널 폭으로 늘리지 않는다). 그림자 없이 흰 면 + 안쪽 선(`screen-desktop.md` §3)
 */
export const cardLink = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  height: "100%",
  minHeight: "264px",
  padding: "20px 24px",
  // 카드 판 위 흰 카드 — 모서리 20 · 선 0(`FE-REQ-076` FR-2 · FR-5, 전 모서리 16 + 안쪽 선)
  borderRadius: vars.radius.xl,
  background: vars.colors.background.white,
  color: "inherit",
  textDecoration: "none",
  transition: `background ${vars.motion.duration.instant}`,
  selectors: {
    "&:hover": { background: SURFACE.weakFill },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});

export const head = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
});

/** 미리보기 자리 — 칸을 만들지 않는다(`contents`) */
export const previewSlot = style({ display: "contents" });

export const title = style({
  flex: 1,
  margin: 0,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  color: vars.colors.desk.text1,
});

export const values = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, margin: 0 });

/** 주인공 값 — 라벨(12/500 · 2단) 위, 값 18/700 아래 */
export const hero = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

/** 보조 값 — 라벨 · 값을 한 줄에 붙인다(13/600) */
export const sub = style({ display: "flex", alignItems: "baseline", gap: vars.space.sm });

export const label = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/** 주인공 금액 24/700(`deskType.price` — 금액 카드 주인공과 같은 단, `FE-REQ-076` FR-5 · 전 18) */
export const heroValue = style({
  margin: 0,
  fontSize: vars.deskType.price.fontSize,
  lineHeight: vars.deskType.price.lineHeight,
  fontWeight: vars.deskType.price.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

/** 비어 있는 카드(`state: "empty"`)의 값 — "아직 없어요"를 주인공 숫자처럼 크게 쓰지 않는다(`FE-REQ-048` FR-2 · 0 과 없음 구분) */
export const emptyValue = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text2,
});

export const subValue = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

/** 값 아래 한 줄 — 서버가 붙인 문장 · 받지 못한 카드의 안내 */
export const note = style({
  margin: 0,
  marginTop: "auto",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/** 비어 있는 카드의 첫 행동 — 버튼 모양 글자(카드 전체가 링크라 실제 버튼이 아니다). 옅은 브랜드 면 · 13/600 */
export const action = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: "2px",
  marginTop: "auto",
  height: "32px",
  padding: "0 8px 0 12px",
  borderRadius: "8px",
  background: vars.colors.brand.lighter,
  color: vars.colors.brand.active,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
});
