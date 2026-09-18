import { recipe } from "@vanilla-extract/recipes";
import { globalStyle, style } from "@vanilla-extract/css";
import { vars } from "../../styles/tokens.css";

// Table Container
export const tableContainerStyles = recipe({
  base: {
    width: "100%",
    overflowX: "auto",
    WebkitOverflowScrolling: "touch",

    selectors: {
      "&::-webkit-scrollbar": {
        height: "8px",
      },
      "&::-webkit-scrollbar-track": {
        background: vars.colors.background.tertiary,
        borderRadius: vars.radius.small,
      },
      "&::-webkit-scrollbar-thumb": {
        background: vars.colors.border.default,
        borderRadius: vars.radius.small,
      },
      "&::-webkit-scrollbar-thumb:hover": {
        background: vars.colors.border.dark,
      },
    },
  },

  variants: {
    bordered: {
      true: {
        border: `1px solid ${vars.colors.border.light}`,
        borderRadius: vars.radius.base,
      },
      false: {},
    },
  },

  defaultVariants: {
    bordered: false,
  },
});

// Table Element
export const tableStyles = recipe({
  base: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: vars.fontSizes.base,
    color: vars.colors.text.primary,
    background: vars.colors.background.white,
  },

  variants: {
    size: {
      sm: {
        fontSize: vars.fontSizes.sm,
      },
      md: {
        fontSize: vars.fontSizes.base,
      },
      lg: {
        fontSize: vars.fontSizes.lg,
      },
    },

    layout: {
      auto: {
        tableLayout: "auto",
      },
      fixed: {
        tableLayout: "fixed",
      },
    },

    striped: {
      true: {},
      false: {},
    },

    hoverable: {
      true: {},
      false: {},
    },
  },

  defaultVariants: {
    size: "md",
    layout: "auto",
    striped: false,
    hoverable: false,
  },
});

// Table Header
export const tableHeaderStyles = recipe({
  base: {
    position: "sticky",
    top: 0,
    zIndex: 10,
    backgroundColor: "white" /* 필수 */,
  },

  variants: {
    bordered: {
      true: {
        borderBottom: `1px solid ${vars.colors.border.light}`,
      },
      false: {
        borderBottom: "none",
      },
    },

    /** Background variant 추가 */
    background: {
      white: { background: vars.colors.background.white },
      secondary: { background: vars.colors.background.secondary },
      tertiary: { background: vars.colors.background.tertiary },
      transparent: { background: "transparent" },
    },
  },

  /** 기본 값 */
  defaultVariants: {
    bordered: false,
    background: "white",
  },
});

// Table Header Cell
export const tableHeaderCellStyles = recipe({
  base: {
    padding: `${vars.space.md} ${vars.space.lg}`,
    textAlign: "left",
    fontWeight: vars.fontWeights.medium,
    color: vars.colors.text.tertiary,
    fontSize: vars.fontSizes.sm,
    whiteSpace: "nowrap",
    background: "transparent",
  },

  variants: {
    align: {
      left: { textAlign: "left" },
      center: { textAlign: "center" },
      right: { textAlign: "right" },
    },

    sortable: {
      true: {
        cursor: "pointer",
        userSelect: "none",
        position: "relative",
        paddingRight: vars.space["2xl"],

        selectors: {
          "&:hover": {
            background: vars.colors.background.secondary,
          },
        },
      },
      false: {},
    },
  },

  defaultVariants: {
    align: "left",
    sortable: false,
  },
});

// Table Body
export const tableBodyStyles = style({
  background: vars.colors.background.white,
});

// Table Row
/**
 * 행 hover — **셀(`td`)에 칠한다.**
 *
 * 행(`tr`)에 칠하면 셀이 자기 배경을 가진 경우(줄무늬·고정 헤더·선택 상태) 그 아래로
 * 가려진다. 토스증권 표가 같은 방식이다: `tr:hover td { background-color: grey100 }`.
 *
 * 색은 `background.primary`(#F2F4F6)이고 토스의 `grey100` 과 같은 값이다. 이전 값
 * (`secondary` #F8F9FA)은 흰 배경 위에서 거의 보이지 않았다 — 어느 행에 있는지
 * 알 수 없으면 hover 가 없는 것과 같다.
 *
 * `globalStyle` 을 쓰는 이유: vanilla-extract 의 `style()` 은 자손 선택자를 막는다.
 * 빈 앵커 클래스를 만들고 그 클래스 기준으로 전역 규칙 하나를 건다.
 */
const rowHoverable = style({});

globalStyle(`${rowHoverable}:hover > td`, {
  backgroundColor: vars.colors.background.primary,
});

export const tableRowStyles = recipe({
  base: {
    borderBottom: `1px solid ${vars.colors.border.light}`,
    transition: vars.transitions.fast,

    selectors: {
      "&:last-child": {
        borderBottom: "none",
      },
    },
  },

  variants: {
    hoverable: {
      true: rowHoverable,
      false: {},
    },

    clickable: {
      true: {
        cursor: "pointer",
      },
      false: {},
    },

    selected: {
      true: {
        background: vars.colors.brand.lighter,

        selectors: {
          "&:hover": {
            background: vars.colors.brand.lighter,
          },
        },
      },
      false: {},
    },

    striped: {
      true: {
        selectors: {
          "&:nth-child(even)": {
            background: vars.colors.background.secondary,
          },
        },
      },
      false: {},
    },
    bordered: {
      true: {
        borderBottom: `1px solid ${vars.colors.border.light}`,
      },
      false: {
        borderBottom: "none",
      },
    },
  },

  defaultVariants: {
    hoverable: false,
    clickable: false,
    selected: false,
    striped: false,
    bordered: false,
  },
});

// Table Cell
export const tableCellStyles = recipe({
  base: {
    padding: `${vars.space.md} ${vars.space.lg}`,
    verticalAlign: "middle",
  },

  variants: {
    align: {
      left: { textAlign: "left" },
      center: { textAlign: "center" },
      right: { textAlign: "right" },
    },

    nowrap: {
      true: { whiteSpace: "nowrap" },
      false: {},
    },

    size: {
      sm: {
        padding: `${vars.space.sm} ${vars.space.md}`,
      },
      md: {
        padding: `${vars.space.md} ${vars.space.lg}`,
      },
      lg: {
        padding: `${vars.space.lg} ${vars.space.xl}`,
      },
    },
  },

  defaultVariants: {
    align: "left",
    nowrap: false,
    size: "md",
  },
});

// Empty State
export const emptyStateStyles = style({
  padding: vars.space["3xl"],
  textAlign: "center",
  color: vars.colors.text.tertiary,
});

// Sort Icon
export const sortIconStyles = style({
  position: "absolute",
  right: vars.space.sm,
  top: "50%",
  transform: "translateY(-50%)",
  display: "flex",
  flexDirection: "column",
  gap: "2px",
});

export const sortArrowStyles = recipe({
  base: {
    width: 0,
    height: 0,
    borderLeft: "4px solid transparent",
    borderRight: "4px solid transparent",
  },

  variants: {
    direction: {
      up: {
        borderBottom: `6px solid ${vars.colors.text.tertiary}`,
      },
      down: {
        borderTop: `6px solid ${vars.colors.text.tertiary}`,
      },
    },

    active: {
      true: {
        borderBottomColor: vars.colors.brand.primary,
        borderTopColor: vars.colors.brand.primary,
      },
      false: {},
    },
  },

  defaultVariants: {
    direction: "up",
    active: false,
  },
});
// Scroll Table Container
export const scrollTableContainerStyles = recipe({
  base: {
    width: "100%",
    /**
     * **flex 자식이 내용보다 작아질 수 있게 한다.**
     *
     * flex item 의 `min-width` 기본값은 `auto` 라 내용 폭 아래로 줄지 않는다. 표가
     * 들어 있으면 그 폭이 컬럼 합이라, 좁은 화면에서 컨테이너가 부모를 밀고 나가
     * **`body` 가 가로로 스크롤된다** (`FE-REQ-010` FR-51). 표만 자체 스크롤해야 한다.
     */
    minWidth: 0,
    display: "flex",
    flexDirection: "column",
    backgroundColor: vars.colors.background.white,
  },

  variants: {
    maxHeight: {
      "400px": { maxHeight: "400px" },
      "600px": { maxHeight: "600px" },
      "800px": { maxHeight: "800px" },
      "1000px": { maxHeight: "1000px" },
      /**
       * 뷰포트 기준 (FR-53).
       *
       * 고정 800px 은 화면이 그보다 낮으면 표가 잘린 채로 페이지를 밀어낸다.
       * 80vh 는 1000px 높이에서 800px 이라 **기존 화면에서 값이 같고**, 낮은 화면에서만
       * 줄어든다.
       */
      viewport: { maxHeight: "80vh" },
    },
  },

  defaultVariants: {
    maxHeight: "600px",
  },
});

// Scroll Table Inner (실제 스크롤)
/**
 * 스크롤 영역 안의 표는 **줄어들지 않는다.**
 *
 * 컨테이너가 좁아지면 `table` 은 기본적으로 그 폭에 맞춰 줄고, 셀 내용이 글자 단위로
 * 접힌다 — 375px 에서 "제이피와이코인"이 한 글자씩 세로로 쌓였다. 컬럼을 줄이지 않고
 * 좁으면 스크롤한다는 것이 이 표의 규칙이다 (`FE-REQ-010` FR-55).
 */
const scrollTableInnerBase = style({});

globalStyle(`${scrollTableInnerBase} > table`, {
  minWidth: "max-content",
});

export const scrollTableInnerStyles = recipe({
  base: [scrollTableInnerBase, {
    flex: 1,
    minHeight: 0,
    overflowX: "auto",
    overflowY: "auto",
    WebkitOverflowScrolling: "touch",
    scrollBehavior: "smooth",

    selectors: {
      "&::-webkit-scrollbar": {
        width: "8px",
        height: "8px",
      },
      "&::-webkit-scrollbar-track": {
        background: vars.colors.background.tertiary,
        borderRadius: vars.radius.small,
      },
      "&::-webkit-scrollbar-thumb": {
        background: vars.colors.border.default,
        borderRadius: vars.radius.small,
      },
      "&::-webkit-scrollbar-thumb:hover": {
        background: vars.colors.border.dark,
      },
    },
  }],

  variants: {
    hideScrollbar: {
      true: {
        scrollbarWidth: "none",
        msOverflowStyle: "none",

        selectors: {
          "&::-webkit-scrollbar": {
            display: "none",
          },
        },
      },
      false: {},
    },
  },

  defaultVariants: {
    hideScrollbar: false,
  },
});
