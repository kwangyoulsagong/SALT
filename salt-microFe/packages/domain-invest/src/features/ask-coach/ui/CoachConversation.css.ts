import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/** 문장 · 목록 한 줄은 최대 720(`screen-desktop.md` §2) */
export const root = style({ display: "flex", flexDirection: "column", gap: vars.space.md, maxWidth: "720px" });

export const intro = style({
  margin: 0,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
});

/** 칸 하나가 겹쳐 놓이는 자리 — "새 답 보기" 가 칸 아래쪽 위에 뜬다 */
export const logFrame = style({ position: "relative" });

/** 대화는 자기 스크롤 칸 — 칩 · 입력이 늘 보인다(`FE-REQ-031` FR-21). 높이는 화면의 6할 · 최대 640 */
export const log = style({
  display: "flex",
  flexDirection: "column",
  gap: vars.space.sm,
  minHeight: "120px",
  maxHeight: "min(60vh, 640px)",
  overflowY: "auto",
  overscrollBehavior: "contain",
  paddingRight: vars.space.xs,
});

export const older = style({ display: "flex", justifyContent: "center" });

export const newMessage = style({
  position: "absolute",
  left: "50%",
  bottom: vars.space.sm,
  transform: "translateX(-50%)",
});

/** 답 안 카드 — 말풍선 폭을 다 쓴다 */
export const card = style({ display: "flex", flexDirection: "column", gap: vars.space.xs, marginTop: vars.space.sm });

/** 라벨 단 12/500(시각) */
export const time = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
});

/** 섹션 단 14/600 */
export const briefingTitle = style({
  margin: 0,
  marginBottom: vars.space.xs,
  fontSize: "14px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
});

export const sentences = style({ margin: 0, paddingLeft: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: vars.space.xs });

export const meta = style({ display: "flex", flexWrap: "wrap", alignItems: "center", gap: vars.space.sm });

export const links = style({ display: "flex", flexWrap: "wrap", gap: vars.space.sm, margin: 0, padding: 0, listStyle: "none" });

export const link = style({
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.brand.primary,
  textDecoration: "none",
  selectors: { "&:hover": { textDecoration: "underline" } },
});

export const chips = style({ display: "flex", flexWrap: "wrap", gap: vars.space.sm });

export const composer = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const actions = style({ display: "flex", justifyContent: "flex-end" });

/** 라벨 단 12/500 · 2단 글자색(AA) */
export const note = style({
  margin: 0,
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
});
