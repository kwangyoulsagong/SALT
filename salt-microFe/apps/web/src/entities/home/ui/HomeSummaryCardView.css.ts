import { globalStyle, style } from "@vanilla-extract/css";

import { EMBED_APP, EMBED_ATTRIBUTE, IN_APP_WEBVIEW } from "@repo/core/embed";
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
  padding: vars.space.lg2,
  borderRadius: SURFACE.panelRadius,
  background: vars.colors.background.white,
  boxShadow: SURFACE.hairline,
  color: "inherit",
  textDecoration: "none",
  transition: `background ${vars.motion.duration.instant}`,
  selectors: {
    "&:hover": { background: SURFACE.weakFill },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
    // 앱 웹뷰는 목록 행(`FE-REQ-048` FR-9 · `FE-REQ-060` FR-M3) — 왼쪽 아이콘 · 가운데 제목 + 값 두 줄 · 오른쪽 셰브론. 카드 면 · 선을 걷고 행 아래 선 하나
    [IN_APP_WEBVIEW]: {
      display: "grid",
      gridTemplateColumns: "auto minmax(0, 1fr) auto",
      alignItems: "center",
      columnGap: "12px",
      rowGap: "2px",
      minHeight: 0,
      padding: "12px 4px",
      borderRadius: 0,
      background: "transparent",
      boxShadow: `inset 0 -1px 0 ${vars.colors.desk.line}`,
    },
  },
});

export const head = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  // 앱 웹뷰 — 머리 줄을 풀어 아이콘 · 제목 · 셰브론이 행 격자 칸에 바로 놓인다
  selectors: { [IN_APP_WEBVIEW]: { display: "contents" } },
});
const inApp = `html[${EMBED_ATTRIBUTE}="${EMBED_APP}"]`;
// 아이콘은 첫 칸에서 행 높이 전체 · 셰브론은 셋째 칸(둘 다 머리 줄의 자식이라 클래스가 없다)
globalStyle(`${inApp} ${head} > :first-child`, { gridColumn: "1", gridRow: "1 / span 4" });
globalStyle(`${inApp} ${head} > :last-child`, { gridColumn: "3", gridRow: "1 / span 4" });

/** 미리보기 자리 — 데스크톱은 칸을 만들지 않고(`contents`) 그대로, 앱 웹뷰 목록 행에서는 뺀다(FR-M3) */
export const previewSlot = style({ display: "contents", selectors: { [IN_APP_WEBVIEW]: { display: "none" } } });

/** 앱 웹뷰 행 가운데 칸 — 제목 아래 줄들 */
const appMiddle = { gridColumn: "2" } as const;

export const title = style({
  flex: 1,
  margin: 0,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  color: vars.colors.desk.text1,
  // 앱 웹뷰 행 제목 = `t5`
  selectors: {
    [IN_APP_WEBVIEW]: { ...appMiddle, fontSize: vars.appType.body.fontSize, lineHeight: vars.appType.body.lineHeight, fontWeight: vars.appType.body.fontWeight, color: vars.colors.text.primary },
  },
});

export const values = style({ display: "flex", flexDirection: "column", gap: vars.space.sm, margin: 0, selectors: { [IN_APP_WEBVIEW]: { ...appMiddle, gap: 0 } } });

/** 주인공 값 — 라벨(12/500 · 2단) 위, 값 18/700 아래 */
export const hero = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  // 앱 웹뷰 — 주인공도 이름 · 값 한 줄(값 `t6` 두 개 세로, FR-M3). 글자를 키우면 값이 아래로
  selectors: { [IN_APP_WEBVIEW]: { flexDirection: "row", flexWrap: "wrap", alignItems: "baseline", gap: "0 8px" } },
});

/** 보조 값 — 라벨 · 값을 한 줄에 붙인다(13/600) */
export const sub = style({ display: "flex", alignItems: "baseline", gap: vars.space.sm, selectors: { [IN_APP_WEBVIEW]: { flexWrap: "wrap", gap: "0 8px" } } });

export const label = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  selectors: { [IN_APP_WEBVIEW]: { fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.desc.lineHeight, color: vars.colors.text.tertiary } },
});

/** 앱 웹뷰 값 = `t6`(FR-M3) */
const appValue = { fontSize: vars.appType.desc.fontSize, lineHeight: vars.appType.desc.lineHeight, fontWeight: "600", color: vars.colors.text.primary, overflowWrap: "anywhere" } as const;

export const heroValue = style({
  margin: 0,
  fontSize: vars.deskType.title.fontSize,
  lineHeight: vars.deskType.title.lineHeight,
  fontWeight: vars.deskType.title.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  selectors: { [IN_APP_WEBVIEW]: appValue },
});

/** 비어 있는 카드(`state: "empty"`)의 값 — "아직 없어요"를 주인공 숫자처럼 크게 쓰지 않는다(`FE-REQ-048` FR-2 · 0 과 없음 구분) */
export const emptyValue = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text2,
  selectors: { [IN_APP_WEBVIEW]: { ...appValue, fontWeight: "500", color: vars.colors.text.tertiary } },
});

export const subValue = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  selectors: { [IN_APP_WEBVIEW]: { ...appValue, fontWeight: "500" } },
});

/** 값 아래 한 줄 — 서버가 붙인 문장 · 받지 못한 카드의 안내 */
export const note = style({
  margin: 0,
  marginTop: "auto",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  selectors: { [IN_APP_WEBVIEW]: { ...appMiddle, marginTop: "2px", fontSize: vars.appType.caption.fontSize, lineHeight: vars.appType.caption.lineHeight, color: vars.colors.text.tertiary } },
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
  // 앱 웹뷰 — 행 안 글자 링크 모양(정보 영역 안 큰 버튼 0, `FE-REQ-060` 모바일 표 "버튼")
  selectors: { [IN_APP_WEBVIEW]: { ...appMiddle, height: "auto", padding: 0, marginTop: "4px", background: "transparent", fontSize: vars.appType.caption.fontSize } },
});
