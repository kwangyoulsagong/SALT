import { keyframes, style } from "@vanilla-extract/css";
import { recipe } from "@vanilla-extract/recipes";
import { vars } from "../../styles/tokens.css";

const fadeIn = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});

const popIn = keyframes({
  from: { opacity: 0, transform: "scale(.96)" },
  to: { opacity: 1, transform: "scale(1)" },
});

export const overlayStyles = style({
  position: "fixed",
  inset: 0,
  zIndex: vars.zIndices.modal,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: vars.space.lg,
  background: vars.colors.overlay.dark,
  animation: `${fadeIn} ${vars.transitions.base}`,

  "@media": {
    "(prefers-reduced-motion: reduce)": {
      animation: "none",
    },
  },
});

export const panelStyles = recipe({
  base: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    maxHeight: "85vh",
    borderRadius: vars.radius.xl,
    background: vars.colors.background.white,
    boxShadow: vars.elevation.lg,
    fontFamily: vars.fontFamily.base,
    animation: `${popIn} ${vars.transitions.base}`,

    "@media": {
      "(prefers-reduced-motion: reduce)": {
        animation: "none",
      },
    },
  },

  variants: {
    size: {
      sm: { maxWidth: "320px" },
      md: { maxWidth: "480px" },
      lg: { maxWidth: "720px" },
      // 읽는 모달 — 참고 화면 실측(폭 680 · 모서리 16 · 위아래 여백 40 → 높이 100vh − 80)
      article: { maxWidth: "680px", maxHeight: "calc(100vh - 80px)", borderRadius: vars.radius.large },
      // 검색 모달 — 참고 화면 실측(2026-11-09): 폭 640 · 높이 최대 600 · 위 8 · 모서리 16 · 그림자 두 겹(배경 막이 없어 그림자가 판을 가른다)
      search: {
        maxWidth: "640px",
        maxHeight: "min(600px, calc(100vh - 16px))",
        borderRadius: vars.radius.large,
        overflow: "hidden",
        boxShadow: "0 12px 28px -4px rgba(0, 0, 0, 0.12), 0 8px 56px -4px rgba(0, 0, 0, 0.1)",
      },
    },
  },

  defaultVariants: {
    size: "md",
  },
});

/**
 * `search` — 위 8 · 가로 가운데 · **배경 막 없음**(사용자 D2 2026-11-09 — 뒤 화면이 어두워지지 않는다). 바깥을 누르면 닫히는 면은 그대로 둔다
 * (투명). 포커스 가둠 · `aria-modal` 은 그대로 — 키보드 · 화면 리더가 모달 밖을 읽지 않게(`FE-REQ-066` FR-6)
 */
export const searchOverlayStyles = style({ alignItems: "flex-start", paddingTop: "8px", background: "transparent", animation: "none" });
/** `search` 본문 — 판이 칸을 나눈다(검색칸 · 스크롤 본문 · 안내 바). 여백 · 스크롤은 안이 정한다 */
export const searchBodyStyles = style({ display: "flex", flexDirection: "column", padding: 0, overflow: "hidden" });

/** `article` — 위아래 여백 40(실측) */
export const articleOverlayStyles = style({ paddingTop: "40px", paddingBottom: "40px" });
/** `article` 머리 — 24/24/16 · 제목이 길면 두 줄까지 감싼다(닫기 단추는 위에 붙는다) */
export const articleHeaderStyles = style({ alignItems: "flex-start", padding: `${vars.space.xl} ${vars.space.xl} ${vars.space.lg}` });
/** `article` 제목 — 데스크톱 제목 단 18/700/24 */
export const articleTitleStyles = style({ fontSize: vars.fontSizes.xl, lineHeight: "24px", overflowWrap: "anywhere" });
/** `article` 본문 — 14/24(읽는 글) · 색 1단 */
export const articleBodyStyles = style({
  padding: `0 ${vars.space.xl} ${vars.space.xl}`,
  fontSize: vars.fontSizes.base,
  lineHeight: "24px",
  color: vars.colors.text.primary,
});

export const headerStyles = style({
  display: "flex",
  alignItems: "center",
  gap: vars.space.sm,
  flexShrink: 0,
  padding: `${vars.space.lg} ${vars.space.lg2} ${vars.space.sm}`,
});

export const titleStyles = style({
  flex: 1,
  minWidth: 0,
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: vars.typography.t4.fontSize,
  lineHeight: vars.typography.t4.lineHeight,
  fontWeight: vars.fontWeights.bold,
});

export const bodyStyles = style({
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  padding: `0 ${vars.space.lg2} ${vars.space.lg}`,
  color: vars.colors.neutral[700],
  fontSize: vars.typography.t6.fontSize,
  lineHeight: vars.typography.t6.lineHeight,
});

export const footerStyles = style({
  display: "flex",
  gap: vars.space.sm,
  flexShrink: 0,
  padding: `0 ${vars.space.lg2} ${vars.space.lg2}`,
});

/** 퇴장 (FE-REQ-044 P-32) — `Dialog` 도 이 모달 위에 있다. 끝나면 `usePresence` 가 DOM 에서 뺀다 */
const fadeOut = keyframes({ from: { opacity: 1 }, to: { opacity: 0 } });
const popOut = keyframes({ from: { opacity: 1, transform: "scale(1)" }, to: { opacity: 0, transform: "scale(.96)" } });

export const overlayClosingStyles = style({
  pointerEvents: "none",
  animation: `${fadeOut} ${vars.motion.duration.base} ${vars.motion.easing.exit} forwards`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});

export const panelClosingStyles = style({
  animation: `${popOut} ${vars.motion.duration.base} ${vars.motion.easing.exit} forwards`,
  "@media": { "(prefers-reduced-motion: reduce)": { animation: "none" } },
});
