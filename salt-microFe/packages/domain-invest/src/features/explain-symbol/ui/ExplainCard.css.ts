import { keyframes, style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 해설 칸 — 4단(F017 v2 단계 3 · `FE-REQ-064` FR-2 · FR-6). 문장 한 줄은 720 까지(`screen-desktop.md` §2).
 * 움직임은 transform · opacity 만, 줄인 모션이면 멈춘다(`motion.md` §5 · §7)
 */
export const card = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.md,
  minWidth: 0,
});

export const cardHeader = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: vars.space.sm,
});

/** 패널 이름 칩 13/600 모서리 7 — 점검 칸과 같은 실측값(FR-6) */
export const nameChip = style({
  margin: 0,
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

/** 정리 시각 · 단 설명 — 라벨 12/500 2단(`screen-desktop.md` §2) */
export const note = style({
  margin: 0,
  color: vars.colors.text.secondary,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
});

export const block = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  maxWidth: "720px",
});

export const blockHeading = style({
  margin: 0,
  color: vars.colors.text.secondary,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
});

const still = { "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } } } as const;
const rise = keyframes({ from: { opacity: 0, transform: "translateY(4px)" }, to: { opacity: 1, transform: "none" } });

/** 문장 하나 — 13/600/20 본문. 차례 등장은 `animationDelay`(인라인 — 몇 번째 문장인지는 실행 값) */
export const sentence = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "13px",
  lineHeight: "20px",
  wordBreak: "keep-all",
  animation: `${rise} ${vars.motion.duration.base} ${vars.motion.easing.enter} both`,
  ...still,
});

/** 문장 끝 번호 칩 — 누르면 그 사실(이름 · 시각 · 원문) */
export const chip = style({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: "18px",
  height: "18px",
  marginLeft: "4px",
  padding: "0 4px",
  border: "none",
  borderRadius: "6px",
  background: "rgba(2,32,71,.05)",
  color: vars.colors.text.secondary,
  fontSize: "11px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  fontVariantNumeric: "tabular-nums",
  verticalAlign: "1px",
  cursor: "pointer",
  transition: `background ${vars.motion.duration.instant} ${vars.motion.easing.enter}`,
  selectors: {
    "&:hover": { background: "rgba(2,32,71,.09)" },
    '&[aria-expanded="true"]': { background: "rgba(2,32,71,.12)", color: vars.colors.text.primary },
  },
});

/** 펼친 출처 — 정보 상자(`screen-desktop.md` §3) */
export const sources = style({
  margin: "4px 0 0",
  padding: "8px 10px",
  listStyle: "none",
  borderRadius: "8px",
  background: "rgba(13,25,74,.02)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  animation: `${rise} ${vars.motion.duration.instant} ${vars.motion.easing.enter} both`,
  ...still,
});

export const sourceRow = style({
  display: "flex",
  alignItems: "baseline",
  gap: vars.space.sm,
  color: vars.colors.text.secondary,
  fontSize: "12px",
  lineHeight: "16px",
});

export const sourceLink = style({
  color: vars.colors.text.secondary,
  textDecoration: "underline",
});
