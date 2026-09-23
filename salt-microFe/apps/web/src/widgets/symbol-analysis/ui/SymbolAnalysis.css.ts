import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

import { SURFACE } from "@/shared/ui/surface.css";

/**
 * 상세 분석 화면.
 *
 * ## 무엇을 참고했고 무엇을 따르지 않았나 (2026-09-23)
 *
 * 사용자가 준 증권 상세 화면의 **층 구조**를 따랐다: 종목 줄 → **큰 가격 + 등락** →
 * 요약 지표 묶음 → 카드 패널 격자 → 하단 고정 유의사항. 전에는 이름과 가격이 같은 줄에서
 * 같은 크기로 경쟁했고(`Heading level=2` 옆에 가격), 지표가 아예 없었다.
 *
 * **따르지 않은 것은 섹션 탭이다.** 참고 화면은 패널이 열 개 가까워 탭으로 나눈다. 우리는
 * 블록이 넷(차트 · 판단 · 해설 · 수익 플랜)이라 탭을 두면 스크롤 대신 클릭이 늘고, 판단과
 * 근거가 다른 탭으로 갈라진다 — **근거 3종이 판단과 같은 화면에 있어야 한다**(공통 수용 기준 1).
 *
 * 카드는 테두리 대신 **흰 면 + 옅은 그림자**다. 회색 배경 위에서 테두리까지 그으면 선이
 * 두 겹으로 보인다.
 */

/** 이 폭 이하는 세로 한 줄이다 (`FE-REQ-026` FR-120 과 같은 경계). */
const STACK_BREAKPOINT = "1024px";
const NARROW = "screen and (max-width: 640px)";
const SIDE_WIDTH = "380px";
const CARD_RADIUS = SURFACE.panelRadius;
/**
 * 카드 그림자. 토큰의 `elevation.sm` 은 흰 배경을 전제해서 옅은 회색 배경 위에서는
 * 거의 보이지 않았다 — 카드 경계가 사라져 화면이 한 장처럼 보였다. 가까운 그림자로 윤곽을
 * 만들고 먼 그림자로 살짝 띄운다.
 */
const CARD_SHADOW = SURFACE.hairline;
/** 하단 고정 바 높이. 본문이 그 아래로 숨지 않게 같은 값만큼 띄운다. */
const DISCLAIMER_BAR_HEIGHT = "44px";

export const layout = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
  paddingTop: "8px",
  paddingBottom: `calc(${DISCLAIMER_BAR_HEIGHT} + 24px)`,
});

/* ── 패널 격자 ──────────────────────────────────────────────── */

export const grid = style({
  display: "grid",
  gridTemplateColumns: `minmax(0, 1fr) ${SIDE_WIDTH}`,
  gap: "16px",
  alignItems: "start",
  "@media": {
    [`screen and (max-width: ${STACK_BREAKPOINT})`]: {
      gridTemplateColumns: "minmax(0, 1fr)",
    },
  },
});

export const column = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  minWidth: 0,
});

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  padding: "20px 24px 24px",
  borderRadius: CARD_RADIUS,
  background: vars.colors.background.white,
  boxShadow: CARD_SHADOW,
  minWidth: 0,
  "@media": {
    [NARROW]: { padding: "16px 16px 20px" },
  },
});

/** 패널 제목 줄. 제목 18/24 bold — 카드 안에서 내용보다 크지 않게 */
export const cardHead = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  minHeight: "28px",
});

export const cardTitle = style({
  fontSize: "18px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  margin: 0,
});

/* ── 하단 고정 유의사항 ─────────────────────────────────────── */

/**
 * 면책을 화면 하단에 상시 둔다. 카드 안에 있으면 스크롤 위치에 따라 보이지 않는데,
 * **추천 응답에 면책이 항상 붙어야 한다**는 것이 계약이다(`ddd-presentation.md` §5).
 */
export const disclaimerBar = style({
  position: "fixed",
  left: 0,
  right: 0,
  bottom: 0,
  zIndex: vars.zIndices.sticky,
  minHeight: DISCLAIMER_BAR_HEIGHT,
  display: "flex",
  alignItems: "center",
  gap: vars.space.md,
  padding: `${vars.space.sm} ${vars.space.xl}`,
  background: vars.colors.background.white,
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  color: vars.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
})

export const disclaimerLabel = style({
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.secondary,
  whiteSpace: "nowrap",
});
