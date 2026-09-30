import { style } from "@vanilla-extract/css";

import { vars as ds } from "@repo/ui/tokens";

/**
 * 이 폭 **미만**이면 앱 대신 안내 한 장(`FE-REQ-043`). 웹 화면은 PC 배치(표 · 우측 패널 · 2열 카드)라
 * 태블릿 세로(768)부터는 그대로 쓴다. 휴대폰은 앱이 맡는다(`RN-REQ-001`).
 * CSS 만으로 가른다 — 서버는 화면 폭을 모르므로 JS 로 고르면 첫 페인트가 깜빡이고 하이드레이션이 어긋난다(`ssr.md`).
 */
export const NARROW_MAX = "screen and (max-width: 767px)";

/** 앱 본문 — 좁은 화면에서 숨긴다 */
export const appContent = style({
  display: "contents",
  "@media": { [NARROW_MAX]: { display: "none" } },
});

/** 안내 — 넓은 화면에서는 없는 것과 같다(이미지는 lazy 라 받지도 않는다) */
export const notice = style({
  display: "none",
  "@media": {
    [NARROW_MAX]: {
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      minHeight: "100vh",
      padding: "20px 16px 32px",
      background: `linear-gradient(180deg, #DCE8FB 0%, ${ds.colors.background.white} 34%)`,
      wordBreak: "keep-all",
    },
  },
});

export const brand = style({
  alignSelf: "flex-start",
  margin: 0,
  fontSize: "18px",
  fontWeight: 800,
  letterSpacing: "0.02em",
  color: ds.colors.text.primary,
});

export const heading = style({
  margin: "56px 0 32px",
  textAlign: "center",
  fontSize: "22px",
  lineHeight: "32px",
  fontWeight: 700,
  color: ds.colors.text.primary,
});

export const line = style({ display: "block" });

/** 모니터 — 화면(스크린샷) · 목 · 받침 */
export const monitor = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "260px",
});

export const bezel = style({
  width: "100%",
  padding: "6px",
  borderRadius: "10px",
  background: ds.colors.neutral[800],
  boxShadow: "0 12px 28px rgba(25, 31, 40, 0.18)",
});

export const screen = style({
  display: "block",
  width: "100%",
  height: "auto",
  aspectRatio: "16 / 10",
  objectFit: "cover",
  objectPosition: "top left",
  borderRadius: "4px",
  background: ds.colors.background.white,
});

export const neck = style({
  width: "44px",
  height: "26px",
  background: `linear-gradient(180deg, ${ds.colors.neutral[400]}, ${ds.colors.neutral[300]})`,
});

export const stand = style({
  width: "120px",
  height: "10px",
  borderRadius: "6px 6px 2px 2px",
  background: ds.colors.neutral[300],
});

export const card = style({
  width: "100%",
  maxWidth: "400px",
  marginTop: "48px",
  padding: "28px 24px 0",
  borderRadius: "24px",
  background: ds.colors.background.primary,
  overflow: "hidden",
});

export const cardTitle = style({
  margin: 0,
  fontSize: "19px",
  lineHeight: "28px",
  fontWeight: 700,
  color: ds.colors.text.primary,
});

export const cardBody = style({
  margin: "10px 0 24px",
  fontSize: "15px",
  lineHeight: "23px",
  color: ds.colors.neutral[700],
});

/** 브라우저 창 — 윗줄 점 셋 */
export const browser = style({
  borderRadius: "10px 10px 0 0",
  background: ds.colors.background.white,
  boxShadow: "0 -2px 16px rgba(25, 31, 40, 0.08)",
  overflow: "hidden",
});

export const browserBar = style({
  display: "flex",
  gap: "5px",
  padding: "8px 10px",
  borderBottom: `1px solid ${ds.colors.neutral[200]}`,
});

export const dot = style({
  width: "7px",
  height: "7px",
  borderRadius: "50%",
  background: ds.colors.neutral[300],
});

export const footer = style({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  width: "100%",
  maxWidth: "400px",
  marginTop: "28px",
});

export const prompt = style({
  margin: "0 0 12px",
  fontSize: "15px",
  color: ds.colors.text.primary,
});

/** 흰 글자 4.84:1(AA) — action.primary(#687AD7)는 3.92:1 이라 한 단계 진한 hover 값을 기본으로 쓴다 */
export const copyButton = style({
  width: "100%",
  height: "52px",
  border: "none",
  borderRadius: "14px",
  background: ds.colors.action.hover,
  color: ds.colors.text.white,
  fontSize: "16px",
  fontWeight: 600,
  cursor: "pointer",
  selectors: {
    "&:active": { background: ds.colors.action.active },
    "&:focus-visible": { outline: `3px solid ${ds.colors.action.active}`, outlineOffset: "2px" },
  },
});

export const copyStatus = style({
  minHeight: "20px",
  margin: "8px 0 0",
  fontSize: "13px",
  lineHeight: "20px",
  color: ds.colors.neutral[700],
  textAlign: "center",
});
