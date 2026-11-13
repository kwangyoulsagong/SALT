import { keyframes, style, styleVariants } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

import { nameChip } from "./ScenarioHeadline.css";

/**
 * 한 장 패널 칸 — 시안 `pm/docs/2026-11-13-one-panel-research.html` §6 그대로(줄 = 아이콘 판 34 + 본문 · 위 1px 선 · 사이 14,
 * 원인 세로 타임라인 · 성적 도넛 52 + 비교 막대 8 · 해설 상자 회색 면 모서리 12 · 내 기준 옅은 브랜드 면).
 * 글자는 데스크톱 5단(라벨 12 · 본문 13 · 섹션 14 · 큰 숫자는 머리 칸 몫), 그림자 없음(`screen-desktop.md` §3).
 * 상승 · 하락 색은 글자 · 부호와 같이 쓴다 — 색만으로 뜻을 전하지 않는다.
 */

const label = {
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[600],
} as const;

export const panel = style({
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  minWidth: 0,
  maxWidth: "720px",
});

export const headRow = style({ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" });

/** 패널 이름 — 칩 모양의 제목(h2) */
export const title = style([nameChip, { margin: 0 }]);

export const srOnly = style({
  position: "absolute",
  width: "1px",
  height: "1px",
  overflow: "hidden",
  clip: "rect(0 0 0 0)",
  whiteSpace: "nowrap",
});

export const aiMark = style({
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.brand.primary,
});

export const asOf = style([label, { marginLeft: "auto", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }]);

// ==================== 부채꼴 ====================

export const fan = style({ display: "block", width: "100%", height: "auto" });
export const fanText = style({ fontSize: "12px", fontWeight: vars.fontWeights.semibold, fontVariantNumeric: "tabular-nums" });

// ==================== 줄 ====================

export const row = style({
  display: "grid",
  gridTemplateColumns: "34px minmax(0, 1fr)",
  gap: "10px",
  paddingTop: "14px",
  borderTop: `1px solid ${vars.colors.neutral[200]}`,
});

export const icon = styleVariants({
  usual: { background: vars.colors.status.warningLight, color: vars.colors.status.warningDark },
  cause: { background: vars.colors.brand.lighter, color: vars.colors.brand.active },
  company: { background: vars.colors.neutral[100], color: vars.colors.neutral[700] },
  invalidation: { background: vars.colors.special.downLight, color: vars.colors.special.downDark },
  track: { background: vars.colors.status.successLight, color: vars.colors.status.successDark },
}, (tone) => [
  {
    width: "34px",
    height: "34px",
    borderRadius: "10px",
    display: "grid",
    placeItems: "center",
    fontSize: "14px",
    fontWeight: vars.fontWeights.bold,
  },
  tone,
]);

export const body = style({ display: "flex", flexDirection: "column", gap: "8px", minWidth: 0 });
export const rowLabel = style([label, { fontWeight: vars.fontWeights.semibold }]);
export const main = style({ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" });
export const mainText = style({
  margin: 0,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  wordBreak: "keep-all",
});
export const sub = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.neutral[700],
  wordBreak: "keep-all",
});

// ① 보통은 — 100칸 점
export const dots = style({ display: "grid", gridTemplateColumns: "repeat(10, 6px)", gap: "2px", flex: "none" });
export const dot = styleVariants({
  up: { background: vars.colors.special.up },
  notUp: { background: vars.colors.special.down },
}, (tone) => [{ width: "6px", height: "6px", borderRadius: "50%" }, tone]);

// ④ 틀리는 때 — 게이지
export const gauge = style({ position: "relative", height: "36px" });
export const gaugeAxis = style({ position: "absolute", left: 0, right: 0, top: "9px", height: "6px", borderRadius: "3px", background: vars.colors.neutral[100] });
export const gaugeBad = style({ position: "absolute", top: "9px", right: 0, height: "6px", borderRadius: "3px", background: vars.colors.special.down });
export const gaugeTick = style({ position: "absolute", top: "3px", width: "2px", height: "18px", background: vars.colors.special.down });
export const gaugeKnob = style({
  position: "absolute",
  top: "4px",
  right: 0,
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  background: vars.colors.background.white,
  border: `3px solid ${vars.colors.text.primary}`,
  boxSizing: "border-box",
});
export const gaugeLabel = styleVariants({
  bad: { color: vars.colors.special.downDark, transform: "translateX(-50%)" },
  now: { right: 0, color: vars.colors.text.primary },
}, (tone) => [
  { position: "absolute", top: "22px", fontSize: "12px", lineHeight: "14px", fontWeight: vars.fontWeights.bold, whiteSpace: "nowrap" },
  tone,
]);

// ⑤ 성적 — 도넛 + 비교 막대
export const score = style({ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 52px", gap: "10px", alignItems: "center" });
export const compare = style({
  display: "grid",
  gridTemplateColumns: "76px minmax(0, 1fr) 40px",
  gap: "8px",
  alignItems: "center",
  fontSize: "12px",
  lineHeight: "16px",
  color: vars.colors.neutral[700],
});
export const compareTrack = style({ height: "8px", borderRadius: "4px", background: vars.colors.neutral[100], overflow: "hidden" });
export const compareFill = styleVariants({
  self: { background: vars.colors.text.primary },
  baseline: { background: vars.colors.neutral[400] },
}, (tone) => [{ display: "block", height: "100%", borderRadius: "4px" }, tone]);
export const compareValue = style({ textAlign: "right", fontWeight: vars.fontWeights.semibold, fontVariantNumeric: "tabular-nums", color: vars.colors.text.primary });

// AI 해설 상자
export const explain = style({
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  padding: "12px 14px",
  borderRadius: "12px",
  background: "rgba(13,25,74,.03)",
});
export const explainHead = style({ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", flexWrap: "wrap" });
export const explainTitle = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  background: vars.colors.background.white,
  borderRadius: "7px",
  padding: "2px 8px",
});
export const explainSub = style(label);
export const sentences = style({ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "6px" });

/** 한 문장씩 등장 — 240ms · transform · opacity(`motion.md` §3 duration.base · easing.enter). 줄인 모션이면 바로 */
const rise = keyframes({ from: { opacity: 0, transform: "translateY(6px)" }, to: { opacity: 1, transform: "none" } });
export const sentence = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "22px",
  color: vars.colors.text.primary,
  wordBreak: "keep-all",
  animationName: rise,
  animationDuration: vars.motion.duration.base,
  animationTimingFunction: vars.motion.easing.enter,
  animationFillMode: "both",
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

/** 출처 — 번호가 아니라 이름 칩(`FE-REQ-064` FR-10) */
export const sourceChip = style({
  display: "inline-block",
  marginLeft: "4px",
  padding: "1px 7px",
  borderRadius: "7px",
  background: vars.colors.neutral[100],
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
  whiteSpace: "nowrap",
  verticalAlign: "1px",
  textDecoration: "none",
  selectors: { "a&:hover": { background: vars.colors.brand.lighter, color: vars.colors.brand.active } },
});

// 내 기준
export const mine = style({
  display: "flex",
  alignItems: "center",
  gap: "6px",
  flexWrap: "wrap",
  padding: "8px 12px",
  borderRadius: "10px",
  background: "rgba(121,73,255,.07)",
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.text.primary,
});
export const mineHead = style({ fontWeight: vars.fontWeights.bold });
export const onlyYou = style({
  padding: "1px 7px",
  borderRadius: "7px",
  background: vars.colors.background.white,
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
});

export const tone = styleVariants({
  up: { color: vars.colors.special.upDark },
  down: { color: vars.colors.special.downDark },
  flat: { color: vars.colors.text.primary },
});
