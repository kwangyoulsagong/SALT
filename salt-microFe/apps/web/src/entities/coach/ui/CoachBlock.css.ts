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


/**
 * 거래소 표시 두 줄(F010 슬라이스 6) — 막은 이유 · 주의 사실이라 표본 메타(`blockedMeta` 2.75:1)보다 진해야 한다.
 * neutral 700 은 회색 면 위 6.45:1(실측) · 흰 면에서 더 높다. 한국어가 단어 중간에서 끊기지 않게 keep-all
 */
export const exchangeLine = style({
  margin: 0,
  color: ds.colors.neutral[700],
  fontSize: "13px",
  lineHeight: "19px",
  wordBreak: "keep-all",
});

export const exchangeReason = style({ wordBreak: "keep-all" });

/**
 * 성적 4요소 한 줄(F009 FR-33). 항목 사이 가운뎃점은 장식이라 CSS 로 — 스크린리더는 목록 항목 넷으로 읽는다.
 * 좁은 폭에서는 항목 단위로 줄이 바뀐다(360 폭에서 가로로 넘치지 않게).
 */
export const claimLine = style({
  margin: 0,
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexWrap: "wrap",
  columnGap: vars.space.small,
  rowGap: "2px",
  color: vars.colors.text.secondary,
  fontSize: vars.fontSizes.small,
  lineHeight: 1.5,
});

/**
 * 항목 사이 가운뎃점 — vanilla-extract 는 자식 선택자를 막아 항목 쪽에 둔다. 점을 **앞 항목 끝**에 붙인다:
 * 다음 항목 앞에 두면 줄이 바뀔 때 점이 새 줄 맨 앞에 남는다(360 폭 실측)
 */
export const claimItem = style({
  selectors: {
    "&:not(:last-child)::after": {
      content: '"·"',
      marginLeft: vars.space.small,
    },
  },
});
