import { globalStyle, style, styleVariants } from "@vanilla-extract/css";

import { enterReveal } from "@repo/ui/enterReveal";
import { HOVER_TRANSITION } from "@repo/ui/transition";
import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@repo/web-shared/ui/surface.css";

/**
 * 홈 대시보드 블록(2026-11-26 — 사용자 "대시보드가 비어 있다 · 정보가 적다 · 그래프 · 아이콘 · 마이크로 인터랙션").
 * 카드 판 그대로(흰 면 · 모서리 20 · 선 · 그림자 0 — `screen-desktop.md` §1-1). 화려함은 3D 아이콘 · 일러스트 · 도메인 색 그래프 · 큰 숫자로만 —
 * 그라데이션 · 반짝임 장식은 쓰지 않는다. 글자는 데스크톱 5단 토큰만(`deskType`)
 */

/** 블록 — 흰 카드. 차례 등장은 `enterReveal`(처음 한 번) */
export const block = style([
  enterReveal,
  {
    display: "flex",
    flexDirection: "column",
    gap: vars.space.md,
    minWidth: 0,
    padding: "20px 24px",
    borderRadius: vars.radius.xl,
    background: vars.colors.background.white,
  },
]);

export const blockHead = style({ display: "flex", alignItems: "center", gap: vars.space.sm, minHeight: "32px" });

export const blockTitle = style({
  flex: 1,
  margin: 0,
  fontSize: vars.deskType.section.fontSize,
  lineHeight: vars.deskType.section.lineHeight,
  fontWeight: vars.deskType.section.fontWeight,
  color: vars.colors.desk.text1,
});

/** 블록 머리 그림 — 일러스트 한 장(장식) */
export const blockArt = style({ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", flexShrink: 0 });

/** 머리 오른쪽 "더 보기 ›" — 글자 링크(2단 → 호버 1단) */
export const blockMore = style({
  display: "inline-flex",
  alignItems: "center",
  gap: "2px",
  padding: "4px 6px",
  borderRadius: "8px",
  color: vars.colors.desk.text2,
  textDecoration: "none",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  transition: HOVER_TRANSITION,
  selectors: {
    "&:hover": { background: SURFACE.weakFill, color: vars.colors.desk.text1 },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});

/** 블록 안 빈 상태 — 그림 위 · 글 아래 가운데 */
export const blockEmpty = style({ display: "flex", flexDirection: "column", alignItems: "center", gap: vars.space.sm, padding: `${vars.space.sm} 0`, textAlign: "center" });

export const eventList = style({ listStyle: "none", margin: 0, padding: 0 });

export const empty = style({
  margin: 0,
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text2,
});

// ── 숫자 띠 ──────────────────────────────────────────────────────

/** 한 장 카드 안 타일 줄 — 좁으면 둘씩 접힌다(넘침 0) */
export const kpiStrip = style([
  enterReveal,
  {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: vars.space.xs,
    padding: vars.space.sm,
    borderRadius: vars.radius.xl,
    background: vars.colors.background.white,
  },
]);

/** 타일 — 통째로 링크. 호버 면 + 아이콘이 살짝 떠오른다(transform 만) */
export const kpiTile = style({
  display: "flex",
  alignItems: "flex-start",
  gap: vars.space.md,
  minWidth: 0,
  padding: "16px",
  borderRadius: "16px",
  color: "inherit",
  textDecoration: "none",
  transition: HOVER_TRANSITION,
  selectors: {
    "&:hover": { background: SURFACE.weakFill },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
  },
});

export const kpiIcon = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: vars.colors.neutral[100],
  transition: `transform ${vars.motion.duration.hover} ${vars.motion.easing.standard}`,
  selectors: { [`${kpiTile}:hover &`]: { transform: "translateY(-2px)" } },
  "@media": { "(prefers-reduced-motion: reduce)": { transition: "none" } },
});
globalStyle(`${kpiIcon} img`, { width: "28px", height: "28px" });

export const kpiMain = style({ display: "flex", flexDirection: "column", gap: "2px", minWidth: 0 });

export const kpiLabel = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const kpiValue = style({
  margin: 0,
  fontSize: vars.deskType.price.fontSize,
  lineHeight: vars.deskType.price.lineHeight,
  fontWeight: vars.deskType.price.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
});

export const kpiSub = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});

/** 투자 칸 작은 흐름선 — 서버 미리보기 그대로(방향 색) */
export const kpiSpark = style({ display: "block", width: "100%", maxWidth: "160px", height: "32px", marginTop: vars.space.xs });

/** 빈 타일의 값 — "아직 없어요"를 주인공 숫자처럼 크게 쓰지 않는다(0 과 없음 구분) */
export const kpiEmpty = style({
  margin: "4px 0 0",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text2,
});

/** 빈 타일의 첫 행동 — 옅은 브랜드 알약(모양만 — 타일 전체가 링크) */
export const kpiAction = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: "2px",
  marginTop: vars.space.xs,
  height: "28px",
  padding: "0 8px 0 10px",
  borderRadius: "8px",
  background: vars.colors.brand.lighter,
  color: vars.colors.brand.active,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.fontWeights.semibold,
});

// ── 시장 ─────────────────────────────────────────────────────────

export const marketList = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column" });

export const marketRow = style({
  display: "grid",
  gridTemplateColumns: "36px minmax(96px, 1fr) minmax(64px, 140px) minmax(96px, auto)",
  alignItems: "center",
  gap: vars.space.md,
  minHeight: "52px",
  padding: `${vars.space.xs} ${vars.space.sm}`,
  borderRadius: "10px",
  color: "inherit",
  textDecoration: "none",
  transition: HOVER_TRANSITION,
  selectors: {
    "a&:hover": { background: SURFACE.weakFill },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "-2px" },
  },
});

/** 지수 표지 — 로고가 없는 칸(원 · 회색 면 · 글자) */
export const indexBadge = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "36px",
  height: "36px",
  borderRadius: "50%",
  background: vars.colors.neutral[100],
  color: vars.colors.desk.text2,
});

export const marketName = style({ display: "flex", flexDirection: "column", minWidth: 0 });

export const marketTitle = style({
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const marketKind = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const marketSpark = style({ display: "block", width: "100%", height: "32px" });

export const marketPrice = style({ display: "flex", flexDirection: "column", alignItems: "flex-end" });

export const marketValue = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
  fontVariantNumeric: "tabular-nums",
});

/** 등락 — 색 + 부호 글자(색만으로 전하지 않는다) */
export const change = styleVariants({
  up: { color: vars.colors.special.up },
  down: { color: vars.colors.special.down },
  flat: { color: vars.colors.desk.text2 },
});

export const changeText = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});

// ── 코치 브리핑 ──────────────────────────────────────────────────

export const briefingList = style({ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: vars.space.sm });

export const briefingRow = style({
  display: "grid",
  gridTemplateColumns: "20px minmax(0, 1fr)",
  gap: vars.space.sm,
  alignItems: "start",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

/** 줄 번호 — 옅은 브랜드 원(순서 표지, 평가 아님) */
export const briefingDot = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "20px",
  height: "20px",
  marginTop: "0",
  borderRadius: "50%",
  background: vars.colors.brand.lighter,
  color: vars.colors.brand.active,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

/** 아래 행동 — 회색 알약(다음 행동 한 단어) */
export const pillLink = style({
  display: "inline-flex",
  alignItems: "center",
  alignSelf: "flex-start",
  gap: "2px",
  marginTop: "auto",
  height: "32px",
  padding: "0 10px 0 12px",
  borderRadius: "12px",
  background: vars.colors.neutral[100],
  color: vars.colors.desk.text1,
  textDecoration: "none",
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  transition: HOVER_TRANSITION,
  selectors: {
    "&:hover": { background: vars.colors.neutral[200] },
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});

// ── 증시 일정 ────────────────────────────────────────────────────

export const eventsHead = style({
  margin: `${vars.space.sm} 0 0`,
  padding: `0 ${vars.space.sm}`,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const eventRow = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  minHeight: "52px",
  padding: `${vars.space.xs} ${vars.space.sm}`,
});

/** 달력 칩 — 달 · 날을 두 줄로(그림 대신 날짜가 그래픽) */
export const dateChip = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  width: "44px",
  height: "44px",
  borderRadius: "12px",
  background: vars.colors.neutral[100],
  fontVariantNumeric: "tabular-nums",
});

export const dateMonth = style({
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "14px",
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

export const dateDay = style({
  fontSize: vars.deskType.section.fontSize,
  lineHeight: "18px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.desk.text1,
});

export const eventMain = style({ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" });

/** D-n 표지 — 사흘 안이면 브랜드 면(곧 다가옴), 아니면 회색 */
export const dday = styleVariants({
  soon: { background: vars.colors.brand.lighter, color: vars.colors.brand.active },
  later: { background: vars.colors.neutral[100], color: vars.colors.desk.text2 },
});

export const ddayText = style({
  flexShrink: 0,
  padding: "2px 8px",
  borderRadius: "8px",
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
});
