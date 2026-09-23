import { style, styleVariants } from "@vanilla-extract/css";

import { vars as ds } from "@repo/ui/tokens";

import { vars } from "@/shared/ui/tokens.css";

/** 막힌 판단 상자 · 판단 자리의 모서리. 이 슬라이스에서만 쓴다 */
const BLOCK_RADIUS = "12px";

/**
 * 판단 자리의 최소 높이 — 스켈레톤 · 판단 · 막힌 안내가 **같은 높이**를 차지한다
 * (`FE-REQ-029` FR-72 · CLS 0). 판단(라벨 · 메타 · 점수 · 요약 4줄)을 기준으로 잡았다.
 */
export const JUDGMENT_MIN_HEIGHT = "128px";
/** 구간 자리. 제목 + 3행 + 규칙 설명 */
export const ZONE_MIN_HEIGHT = "196px";

const slotBase = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.medium,
});

export const judgmentSlot = style([slotBase, { minHeight: JUDGMENT_MIN_HEIGHT }]);

export const zoneSlot = style([slotBase, { minHeight: ZONE_MIN_HEIGHT }]);

/**
 * 막힌 판단 · 추천 상자 — **회색 약한 면**이다. 빨강 · 노랑 · 테두리를 쓰지 않는다: 표본이 쌓이는
 * 중인 정상 상태이고, 경고처럼 보이면 사용자가 무언가 고장 났다고 읽는다(FR-2 · FR-143).
 * 한 줄 사유(15px) 아래 표본 수 · "정상 동작"을 작은 회색 한 줄로 묶는다.
 */
export const blockedBox = style({
  display: "flex",
  alignItems: "flex-start",
  gap: "10px",
  padding: "16px 18px",
  borderRadius: BLOCK_RADIUS,
  background: ds.colors.neutral[100],
});

export const blockedIcon = style({
  flexShrink: 0,
  width: "18px",
  height: "18px",
  marginTop: "2px",
  color: ds.colors.neutral[500],
});

export const blockedText = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const blockedReason = style({
  color: ds.colors.neutral[700],
  fontSize: "15px",
  lineHeight: "22px",
});

export const blockedMeta = style({
  color: ds.colors.neutral[500],
  fontSize: "13px",
  lineHeight: "19px",
});

export const metaLine = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.fontSizes.body,
});

export const scoreLine = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "baseline",
  gap: vars.space.medium,
  color: vars.colors.text.secondary,
  fontSize: vars.fontSizes.heading3,
  fontWeight: vars.fontWeights.semibold,
});

export const scoreNote = style({
  color: vars.colors.text.primary,
  fontSize: vars.fontSizes.small,
  fontWeight: vars.fontWeights.regular,
});

export const summaryLine = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.small,
  color: vars.colors.text.secondary,
  fontSize: vars.fontSizes.body,
});

export const zoneHeader = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.medium,
});

export const zoneValue = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: "2px",
});

export const caption = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.fontSizes.small,
});

const gaugeLineBase = style({
  margin: 0,
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.small,
  fontSize: vars.fontSizes.small,
  lineHeight: 1.5,
});

/** `lowSample` 이면 회색 — 표본이 적은 분포를 같은 무게로 읽지 않게 (FR-118 · FR-21) */
export const gaugeLine = styleVariants({
  normal: [gaugeLineBase, { color: vars.colors.text.secondary }],
  lowSample: [gaugeLineBase, { color: vars.colors.text.email }],
});

/** 화면에는 없고 스크린리더만 읽는다 */
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

