import { style } from "@vanilla-extract/css";

import { vars } from "@repo/ui/tokens";

/**
 * 주문 전 체크 — 거래 기록 폼(`RecordTrade.css`)과 같은 조밀형 실측값을 따른다(2026-09-24 주문 패널):
 * 라벨 열 70px · 라벨 13/500 · 보조 12/400 회색 · 결과 줄은 옅은 면 위 13px, 숫자 `tabular-nums`.
 * 같은 상세 페이지 오른쪽 열에 두 카드가 위아래로 놓여 한 가족으로 읽혀야 한다.
 */

/** 전역 `body` 에 글꼴이 없다(기존) — 카드가 토큰 글꼴을 직접 갖는다. Hero 해시 링크가 여기로 스크롤한다 */
export const form = style({
  display: "flex",
  flexDirection: "column",
  gap: "16px",
  fontFamily: vars.fontFamily.base,
  scrollMarginTop: "16px",
});

export const head = style({ display: "flex", flexDirection: "column", gap: "4px" });

export const title = style({
  margin: 0,
  color: vars.colors.text.primary,
  fontSize: "18px",
  lineHeight: "24px",
  fontWeight: vars.fontWeights.bold,
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px", borderRadius: "4px" },
  },
});

export const description = style({
  margin: 0,
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
});

export const rows = style({
  display: "grid",
  gridTemplateColumns: "70px minmax(0, 1fr)",
  alignItems: "center",
  columnGap: vars.space.sm,
  rowGap: vars.space.sm,
});

export const label = style({
  color: "rgba(24, 31, 43, 0.77)",
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
});

/** 칩 줄 — 좁으면 줄바꿈. 칩이 이미 44px 터치 높이를 갖지 않아 줄 간격으로 손가락 자리를 띄운다 */
export const chips = style({ display: "flex", flexWrap: "wrap", gap: "6px", minWidth: 0 });

/** 금액 칩 아래 직접 입력 — 입력 열에 붙는다 */
export const fieldBelow = style({ gridColumn: "2 / -1" });

export const inputWithAction = style({ display: "flex", gap: "6px", alignItems: "center", minWidth: 0 });

export const unit = style({
  color: "rgba(26, 31, 41, 0.89)",
  fontSize: "13px",
  fontWeight: vars.fontWeights.medium,
});

/** 옅은 회색 면 보조 버튼(현재가) — 거래 기록 폼과 같은 모양 */
export const weakButton = style({
  flexShrink: 0,
  height: "28px",
  padding: "0 10px",
  border: "none",
  borderRadius: "7px",
  background: "rgba(7, 25, 76, 0.04)",
  color: "rgba(26, 31, 41, 0.89)",
  fontSize: "13px",
  fontWeight: vars.fontWeights.semibold,
  cursor: "pointer",
  selectors: {
    "&:hover": { background: vars.colors.neutral[100] },
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px" },
    "&:disabled": { cursor: "not-allowed", opacity: 0.5 },
  },
});

export const stack = style({ display: "flex", flexDirection: "column", gap: vars.space.sm });

export const lines = style({
  margin: 0,
  padding: "12px 14px",
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  borderRadius: "12px",
  background: "rgba(7, 25, 76, 0.04)",
});

export const line = style({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: "6px",
  color: vars.colors.text.secondary,
  fontSize: "13px",
  lineHeight: "20px",
  fontWeight: vars.fontWeights.medium,
  fontVariantNumeric: vars.numeric.tabular,
});

export const lineStrong = style([
  line,
  { color: vars.colors.text.primary, fontSize: "14px", fontWeight: vars.fontWeights.bold },
]);

export const hint = style({
  margin: 0,
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
});

export const warningText = style([hint, { color: vars.colors.text.secondary }]);

/** 새 입력으로 다시 계산하는 중 — 흐리게만, 자리는 그대로 */
export const pending = style({ opacity: 0.55 });

export const errorText = style({
  margin: 0,
  color: vars.colors.status.errorDark,
  fontSize: "12px",
  lineHeight: "18px",
});

/** 끝 문구(FR-150) — 버튼이 아니라 글자다 */
export const closing = style({
  margin: 0,
  paddingTop: "10px",
  borderTop: `1px solid ${vars.colors.neutral[100]}`,
  color: vars.colors.neutral[600],
  fontSize: "12px",
  lineHeight: "18px",
});

/** 좁은 폭 — 카드 대신 여는 줄 하나(44px) */
export const launcher = style({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: vars.space.sm,
  width: "100%",
  minHeight: "44px",
  padding: 0,
  border: "none",
  background: "transparent",
  color: vars.colors.text.primary,
  fontFamily: vars.fontFamily.base,
  fontSize: "16px",
  fontWeight: vars.fontWeights.bold,
  textAlign: "left",
  cursor: "pointer",
  scrollMarginTop: "16px",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.neutral[800]}`, outlineOffset: "2px", borderRadius: "6px" },
  },
});

export const launcherHint = style({
  color: vars.colors.neutral[600],
  fontSize: "12px",
  fontWeight: vars.fontWeights.medium,
});
