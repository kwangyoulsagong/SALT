import { style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 시나리오 — 한 장 패널의 머리(`FE-REQ-064` FR-8 · 시안 `pm/docs/2026-11-13-one-panel-research.html`). 큰 숫자 44/600 ·
 * 뒤 글자 18/700 · 막대 6 · 패널 이름 칩 13/600 모서리 7. 상승 · 하락 색은 토큰(special.up · down) — 글자와 같이 쓴다.
 * 기간을 바꿔도 같은 높이를 차지한다(CLS 0).
 */
/** 실측 2026-11-13 — 평소 칸 470 · 조건 칸 500 안팎(1440 오른쪽 열 380 폭). 로딩 자리와 도착 뒤가 같게 */
const SCENARIO_MIN_HEIGHT = "480px";

export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: "10px",
  minWidth: 0,
  maxWidth: "720px",
  minHeight: SCENARIO_MIN_HEIGHT,
});

export const headRow = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "8px",
  flexWrap: "wrap",
});

export const headNames = style({ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap", minWidth: 0 });

export const nameChip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "24px",
  padding: "0 8px",
  borderRadius: "7px",
  background: "rgba(7,25,76,.04)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
});

/** 출처 — "과거 실제 결과" · "모델 확률". 이름 칩보다 한 단계 약하게 */
export const sourceChip = style({
  display: "inline-flex",
  alignItems: "center",
  height: "22px",
  padding: "0 7px",
  borderRadius: "7px",
  background: vars.colors.neutral[100],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  whiteSpace: "nowrap",
});

export const asOf = style({
  fontSize: "12px",
  lineHeight: "18px",
  color: vars.colors.text.secondary,
  fontVariantNumeric: "tabular-nums",
  whiteSpace: "nowrap",
});

export const big = style({ display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 });

/** 어느 때의 기록인가 — 큰 숫자 위 한 줄 */
export const context = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
  wordBreak: "keep-all",
});

export const oddsRow = style({ margin: 0, display: "flex", alignItems: "baseline", gap: "4px", flexWrap: "wrap" });

/** 큰 숫자 — 44/600 · 오른 횟수라 상승 색(뒤 글자 "번 올랐어요"가 뜻을 말한다) */
export const oddsValue = style({
  fontSize: "44px",
  lineHeight: "48px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.special.up,
  fontVariantNumeric: "tabular-nums",
});

export const oddsSuffix = style({
  fontSize: "18px",
  lineHeight: "26px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
});

export const oddsPct = style({ fontWeight: vars.fontWeights.semibold, color: vars.colors.text.secondary });

/** 2분할 막대 — 오른 몫 · 안 오른 몫(높이 6 · 사이 2) */
export const split = style({
  display: "flex",
  gap: "2px",
  height: "6px",
  borderRadius: "3px",
  overflow: "hidden",
});

export const splitPart = styleVariants({
  up: { background: vars.colors.special.up },
  down: { background: vars.colors.special.down },
});

export const splitLabels = style({
  display: "flex",
  justifyContent: "space-between",
  gap: "8px",
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.bold,
  fontVariantNumeric: "tabular-nums",
});

/** 막대 밑 글자 — 막대(면)는 기본 상승 · 하락색, 글자는 진한 단계(흰 바탕 12px 에 기본색은 대비 미달 — 2026-11-13 axe) */
export const splitLabel = styleVariants({
  up: { color: vars.colors.special.upDark },
  down: { color: vars.colors.special.downDark, textAlign: "right" },
});

export const line = style({
  margin: 0,
  fontSize: vars.typography.t7.fontSize,
  lineHeight: vars.typography.t7.lineHeight,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
  wordBreak: "keep-all",
});

export const meta = style([line, { color: vars.colors.text.secondary }]);

/** 범위 띠 — 0 선 · 80% 띠 · 가운데 눈금. 비대칭은 데이터 그대로(바깥선 없음) */
export const band = style({
  position: "relative",
  height: "18px",
  borderRadius: "4px",
  background: vars.colors.neutral[100],
});

export const bandFill = style({
  position: "absolute",
  top: "4px",
  bottom: "4px",
  borderRadius: "3px",
  background: "rgba(34,114,235,.18)",
});

export const bandMid = style({
  position: "absolute",
  top: "1px",
  bottom: "1px",
  width: "2px",
  marginLeft: "-1px",
  background: vars.colors.text.primary,
});

export const bandZero = style({
  position: "absolute",
  top: 0,
  bottom: 0,
  width: "1px",
  background: vars.colors.text.tertiary,
});

/** 성적 막대 둘 — 이 시나리오 vs 늘 오른다(같은 확신 행) */
export const trackBars = style({ display: "flex", flexDirection: "column", gap: "4px" });

export const trackRow = style({
  display: "grid",
  gridTemplateColumns: "72px 1fr 40px",
  alignItems: "center",
  gap: "8px",
  fontSize: "12px",
  lineHeight: "18px",
  color: vars.colors.text.secondary,
  fontVariantNumeric: "tabular-nums",
});

export const trackBar = style({ height: "6px", borderRadius: "3px", background: vars.colors.neutral[200], overflow: "hidden" });

export const trackFill = styleVariants({
  model: { height: "100%", background: vars.colors.neutral[700] },
  baseline: { height: "100%", background: vars.colors.neutral[400] },
});

/** 빌려 온 기간 안내 · 결함 단 문장 */
export const fallback = style([meta, { padding: "6px 10px", borderRadius: "8px", background: vars.colors.neutral[100] }]);

export const defect = style({
  margin: 0,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  wordBreak: "keep-all",
});

export const more = style({ minWidth: 0 });

export const moreSummary = style({
  cursor: "pointer",
  minHeight: "32px",
  display: "flex",
  alignItems: "center",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.secondary,
});

export const moreList = style({
  margin: 0,
  padding: "4px 0 0",
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});
