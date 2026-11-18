import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 코치 리포트 — 회색 바탕 위 흰 패널 한 단. 패널 모양은 `shared/ui/surface.css`(상세 분석과 같다).
 * 여기는 이 화면에만 있는 것 — 폭 · 머리 · 종목 자리 · 면책 띠.
 */
const CONTENT_MAX_WIDTH = "760px";
const DISCLAIMER_BAR_HEIGHT = "44px";

export const layout = style({
  width: "100%",
  maxWidth: CONTENT_MAX_WIDTH,
  margin: "0 auto",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  padding: `16px 0 calc(${DISCLAIMER_BAR_HEIGHT} + 32px)`,
  minWidth: 0,
});

/** 머리 패널 — 제목 · 생성 시각 | 다시 만들기 */
export const header = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.lg,
  flexWrap: "wrap",
});

export const titleBlock = style({
  display: "flex",
  flexDirection: "column",
  gap: "2px",
  minWidth: 0,
});

export const title = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "22px",
  lineHeight: "30px",
  fontWeight: vars.fontWeights.bold,
});

export const meta = style({
  margin: 0,
  color: vars.colors.text.tertiary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/** 패널 밖 회색 바탕 위의 작은 글 — 제외 안내 */
export const footnote = style({
  margin: 0,
  padding: "4px 8px 0",
  color: vars.colors.text.tertiary,
  fontSize: "12px",
  lineHeight: "18px",
  fontWeight: vars.fontWeights.medium,
});

/** 면책 — 하단 고정(FR-90 · 상세 분석과 같은 자리). 박스 없이 작은 회색 글 */
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
  color: vars.colors.text.tertiary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

export const disclaimerLabel = style({
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.text.primary,
  whiteSpace: "nowrap",
});

/** 월간 복기의 달 고르기 — 거래 폼 입력과 같은 조밀형(32px · 헤어라인 · 13px). 터치 타깃은 세로 여백으로 */
export const monthSelect = style({
  height: "32px",
  padding: "0 28px 0 10px",
  border: `1px solid ${vars.colors.neutral[200]}`,
  borderRadius: "7px",
  background: vars.colors.background.white,
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: "13px",
  fontWeight: vars.fontWeights.medium,
  cursor: "pointer",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" },
  },
});

/** 전역 `body` 글꼴이 없다(기존 부채) — 글꼴을 직접 갖는다. 없으면 세리프로 떨어진다 */
export const subHeading = style({
  margin: "8px 0 0",
  fontFamily: vars.fontFamily.base,
  color: vars.colors.text.primary,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: vars.fontWeights.bold,
});

/** 요약 띠(`/investments`)가 `#앵커`로 올 때 패널 머리가 화면 맨 위에 붙지 않게 */
export const anchorTarget = style({ scrollMarginTop: "16px" });


/** 흰 패널 안 고지 · 기준 시각 — 12px neutral 700(AA). 바깥 회색 바탕용 `footnote` 와 다르다 */
export const panelFootnote = style({
  margin: 0,
  color: vars.colors.neutral[700],
  fontSize: "12px",
  lineHeight: "18px",
});

/** 문장 안 페이지 내부 링크("투자금 적기") — neutral 900 · 밑줄(색만으로 링크를 알리지 않는다) */
export const inlineLink = style({
  color: vars.colors.neutral[900],
  fontWeight: vars.fontWeights.semibold,
  textDecoration: "underline",
  textUnderlineOffset: "2px",
});

/* ── 펼침(F017 v4 순서 6 · `FE-REQ-064` FR-12 — 월간 돌아보기 · 위험 예산 자세히) ─────────────── */

/** 펼침 머리 — 패널 제목 줄 자리. 네이티브 `<details>`(키보드 · 스크린리더가 상태를 안다) */
export const foldSummary = style({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  cursor: "pointer",
  fontFamily: vars.fontFamily.base,
  color: vars.colors.text.primary,
  fontSize: "18px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" } },
});

/** 펼침 머리 오른쪽 안내 — neutral 700(AA) */
export const foldHint = style({
  marginLeft: "auto",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  color: vars.colors.neutral[700],
  whiteSpace: "nowrap",
});

/** 펼침 안 섹션 — 겉 패널 대신 위 선으로 가른다 */
export const embeddedSection = style({
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "16px",
  paddingTop: "16px",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
});

export const embeddedTitle = style({
  margin: 0,
  fontFamily: vars.fontFamily.base,
  color: vars.colors.text.primary,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: vars.fontWeights.bold,
});

/** 위험 예산 한 줄 — 값(넘었으면 진한 경고색 글자 · 글자가 "넘었어요"라 색만으로 말하지 않는다) + 보조 */
export const riskLine = style({
  margin: 0,
  fontFamily: vars.fontFamily.base,
  fontSize: "15px",
  lineHeight: "22px",
  fontWeight: vars.fontWeights.bold,
  color: vars.colors.text.primary,
  fontVariantNumeric: "tabular-nums",
});
export const riskLineAlert = style({ color: vars.colors.status.warningDark });
export const riskNote = style({
  margin: 0,
  fontFamily: vars.fontFamily.base,
  fontSize: "13px",
  lineHeight: "20px",
  color: vars.colors.neutral[700],
});

/** 패널 안 작은 펼침 머리(위험 예산 자세히) — 본문 13/600, neutral 700 */
export const foldHintSummary = style({
  cursor: "pointer",
  fontFamily: vars.fontFamily.base,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.semibold,
  color: vars.colors.neutral[700],
  marginBottom: "8px",
  selectors: { "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" } },
});
