import { recipe } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

export const filterContainer = style({
  display: "flex",
  alignItems: "center",
  whiteSpace: "nowrap",
  overflowX: "auto",

  /**
   * **자기 안에서 스크롤하려면 먼저 줄어들 수 있어야 한다.**
   *
   * `overflowX: auto` 만으로는 부족하다 — flex item 의 `min-width` 기본값이 `auto` 라
   * 내용 폭(버튼 7개 = 334px) 아래로 줄지 않고, 그만큼 페이지를 밀어낸다. 375px 화면에서
   * 문서가 3px 넘쳤다 (`FE-REQ-010` FR-51).
   */
  minWidth: 0,
  maxWidth: "100%",

  // 전체 배경
  background: vars.colors.background.gray,
  padding: "2px 2px",
  borderRadius: vars.radius.base,
});

export const tabButton = recipe({
  base: {
    padding: "5px 9px",
    borderRadius: vars.radius.base,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    fontSize: vars.fontSizes["md"],
    fontWeight: vars.fontWeights.medium,
    color: vars.colors.text.lightGray,
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",

    selectors: {
      "&:hover": {
        color: vars.colors.text.primary,
      },
    },
  },

  variants: {
    active: {
      true: {
        background: vars.colors.background.white,
        color: vars.colors.text.primary,
        fontWeight: vars.fontWeights.medium,
      },
      false: {},
    },
  },
});
