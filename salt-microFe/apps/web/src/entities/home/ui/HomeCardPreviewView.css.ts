import { createVar, globalStyle, keyframes, style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 카드 미리보기(`FE-REQ-048` FR-12) — 카드 값 아래 높이 고정 칸(카드끼리 높이가 맞게).
 * 그림 색은 도메인 색(`colors.domain` — 아이콘 · 점 같은 작은 표지용 토큰, 막대 · 진척 칸도 작은 표지다) — 투자 흐름선만 방향 색(`Sparkline` auto, 아래 한 줄이 부호 글자를 같이 쓴다).
 * 글자는 데스크톱 5단 안(`screen-desktop.md` §2): 이름 · 값 13/600, 한 줄 12/500 2단
 */
export const PREVIEW_HEIGHT = 88;

/** 도메인 색 — 막대 · 진척 칸이 읽는다 */
const accent = createVar();
const accentSoft = createVar();

export const domainAccent = styleVariants({
  savings: { vars: { [accent]: vars.colors.domain.savings, [accentSoft]: "rgba(9, 146, 104, 0.22)" } },
  household: { vars: { [accent]: vars.colors.domain.household, [accentSoft]: "rgba(232, 89, 12, 0.22)" } },
  invest: { vars: { [accent]: vars.colors.domain.invest, [accentSoft]: "rgba(66, 99, 235, 0.22)" } },
  tips: { vars: { [accent]: vars.colors.domain.tips, [accentSoft]: "rgba(196, 106, 0, 0.22)" } },
});

/** 예시(빈 카드) — 회색 · 흐리게, 실제 값으로 읽히지 않게 "예시" 표지를 붙인다(리서치: 샘플은 예시라고 분명히) */
export const ghost = style({
  position: "relative",
  vars: { [accent]: vars.colors.neutral[300], [accentSoft]: vars.colors.neutral[200] },
  color: vars.colors.neutral[300],
});

export const ghostBadge = style({
  position: "absolute",
  top: 0,
  right: 0,
  padding: "0 6px",
  borderRadius: "6px",
  background: vars.colors.neutral[100],
  fontSize: vars.deskType.label.fontSize,
  lineHeight: "20px",
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
});

/** 예시 진척 줄의 이름 자리 — 글자 대신 회색 막대(숫자 · 이름을 지어내지 않는다) */
export const ghostName = style({ height: "8px", width: "64%", borderRadius: "4px", background: vars.colors.neutral[200] });

/** 예시 흐름선 — 회색 단색 */
export const ghostTrend = style({ display: "block", width: "100%", height: "auto", maxHeight: "72px" });

export const previewBox = style({
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  gap: vars.space.xs,
  height: `${PREVIEW_HEIGHT}px`,
  minWidth: 0,
});

/** 흐름선 — 칸 폭에 맞춰 늘인다(viewBox 비율 유지) */
export const trend = style({ display: "block", width: "100%", height: "auto", maxHeight: "72px", overflow: "visible" });

export const caption = style({
  margin: 0,
  fontSize: vars.deskType.label.fontSize,
  lineHeight: vars.deskType.label.lineHeight,
  fontWeight: vars.deskType.label.fontWeight,
  color: vars.colors.desk.text2,
  fontVariantNumeric: "tabular-nums",
});

export const barsFrame = style({ flex: 1, minHeight: 0, display: "flex" });

export const bars = style({
  flex: 1,
  display: "flex",
  alignItems: "flex-end",
  gap: "2px",
  // 바닥 선 — 오지 않은 날까지 한 달 틀이 보이게
  boxShadow: `inset 0 -1px 0 ${vars.colors.desk.line}`,
});

/** 막대가 바닥에서 자란다 — transform 만(`motion.md` §5) · 줄인 모션이면 끔 */
const grow = keyframes({ from: { transform: "scaleY(0)" }, to: { transform: "scaleY(1)" } });

const barBase = style({
  flex: 1,
  minWidth: 0,
  borderRadius: "2px 2px 0 0",
  transformOrigin: "bottom",
  animation: `${grow} ${vars.motion.duration.slow} ${vars.motion.easing.enter} both`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

export const bar = style([barBase, { background: accentSoft }]);

/** 오늘(마지막으로 지나온 날) — 한 칸만 진하게 */
export const barLast = style([barBase, { background: accent }]);

/** 오지 않은 날 — 높이 없는 자리(바닥 선만) */
export const barFuture = style({ flex: 1, minWidth: 0, height: 0 });

export const progressList = style({
  listStyle: "none",
  margin: 0,
  padding: 0,
  display: "flex",
  flexDirection: "column",
  justifyContent: "flex-end",
  gap: vars.space.sm,
  height: `${PREVIEW_HEIGHT}px`,
});

/** 이름(최대 40%) · 막대 · 퍼센트 — 한 줄 */
export const progressRow = style({
  display: "grid",
  gridTemplateColumns: "minmax(0, 40%) minmax(0, 1fr) 52px",
  alignItems: "center",
  gap: vars.space.md,
});

const rowText = style({
  fontSize: vars.deskType.body.fontSize,
  lineHeight: vars.deskType.body.lineHeight,
  fontWeight: vars.deskType.body.fontWeight,
  color: vars.colors.desk.text1,
});

export const progressName = style([rowText, { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }]);

export const progressValue = style([rowText, { textAlign: "right", fontVariantNumeric: "tabular-nums" }]);

/** 진척 칸 — 도메인 색으로 칠한다(`ProgressBar` 의 칸 · 바탕) */
export const progressTrack = style({});
// 두 번 겹친 선택자 — `ProgressBar` 자기 칸 색(클래스 하나)보다 앞서게
globalStyle(`${progressTrack}${progressTrack}`, { background: accentSoft });
globalStyle(`${progressTrack} > div`, { background: accent });
