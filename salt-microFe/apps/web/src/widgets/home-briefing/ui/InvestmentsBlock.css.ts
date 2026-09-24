import { style } from "@vanilla-extract/css";

import { vars } from "@/shared/ui/tokens.css";

/**
 * 카드 모양은 그대로 — 링크 밑줄 · 색만 걷는다. 누를 수 있다는 것은 셰브론 · 커서 · 포커스 링으로 알린다.
 *
 * **`width: 100%` 가 빠지면 패널이 줄어든다**(2026-09-24 사용자 지적). 부모 `FlexBox` 가 `align: start` 라
 * 자식은 내용 폭까지만 늘어난다 — 카드를 직접 두었을 때는 카드가 폭을 가졌지만 링크로 감싸면서 잃었다.
 */
export const investmentsLink = style({
  display: "block",
  width: "100%",
  color: "inherit",
  textDecoration: "none",
  borderRadius: "16px",
  selectors: {
    "&:focus-visible": { outline: `2px solid ${vars.colors.brand.primary}`, outlineOffset: "2px" },
  },
});
