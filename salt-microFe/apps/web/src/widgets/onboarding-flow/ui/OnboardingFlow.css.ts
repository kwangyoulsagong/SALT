import { style } from "@vanilla-extract/css";
import { vars } from "@repo/ui/tokens";

/**
 * 온보딩 — 모바일 한 열 (FE-REQ-044 · 2026-09-30 QA).
 * 참고 화면 구성: 위에서 옅어지는 배경 · 가운데 정렬 · 두 줄 큰 제목 · 장면 · 하단 고정 버튼.
 */
export const page = style({
  minHeight: "100dvh",
  // 앱 틀의 main 이 화면 높이 세로 flex 라 줄어들면 배경이 화면 높이에서 끊긴다 — 내용만큼 늘어나게(2026-09-30 QA)
  flexShrink: 0,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  padding: `${vars.space["2xl"]} ${vars.space.xl} calc(96px + env(safe-area-inset-bottom, 0px))`,
  // 화면 끝까지 부드럽게 — 70% 에서 흰색으로 끝나 아래가 흰 띠로 보였다(2026-09-30 QA)
  background: `linear-gradient(180deg, ${vars.colors.graphic.backdrop} 0%, ${vars.colors.graphic.backdrop} 35%, ${vars.colors.background.white} 100%)`,
  fontFamily: vars.fontFamily.base,
});

export const loading = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: vars.space.md,
  marginTop: "30vh",
});

/** 점 진행 표시 — 지금 단계만 길쭉한 알약 */
export const dots = style({
  display: "flex",
  gap: vars.space.sm,
  margin: 0,
  padding: 0,
  listStyle: "none",
});

const dotBase = {
  height: "6px",
  borderRadius: vars.radius.full,
  transition: `background-color ${vars.motion.duration.base}`,
} as const;

export const dot = style({ ...dotBase, width: "6px", background: vars.colors.neutral[300] });

export const dotActive = style({ ...dotBase, width: "20px", background: vars.colors.brand.primary });

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0, 0, 0, 0)",
  whiteSpace: "nowrap",
});

export const step = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "440px",
  marginTop: vars.space["3xl"],
  textAlign: "center",
});

export const accepted = style({
  marginBottom: vars.space.lg,
});

/** 두 줄 제목 — 둘째 줄이 강조색. 참고 화면 실측 약 30px / 굵게 */
export const headline = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "28px",
  lineHeight: "38px",
  fontWeight: vars.fontWeights.bold,
  letterSpacing: "-0.02em",
  wordBreak: "keep-all",
});

export const accent = style({
  color: vars.colors.brand.primary,
});

export const sub = style({
  margin: `${vars.space.md} 0 0`,
  color: vars.colors.text.lightGray,
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
  wordBreak: "keep-all",
});

export const scene = style({
  display: "flex",
  justifyContent: "center",
  margin: `${vars.space["2xl"]} 0`,
});

/** 초대 폼 — 가운데 열 안에서 입력은 왼쪽 정렬 */
export const form = style({
  width: "100%",
  textAlign: "left",
});


/** 하단 고정 버튼 — 넓은 화면에서도 본문 열 폭을 넘지 않는다(데스크톱에서 1500px 버튼이 됐다, 2026-09-30 QA) */
export const ctaInner = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.xs,
  width: "100%",
  maxWidth: "440px",
  margin: "0 auto",
});

/** 이 화면의 하단 버튼 영역은 바탕을 비운다 — 흰 면 · 그림자가 배경 그라데이션을 자른다 */
export const ctaBar = style({
  background: "transparent",
  boxShadow: "none",
});
