import { recipe } from "@vanilla-extract/recipes";
import { style } from "@vanilla-extract/css";
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
      true: {
        selectors: {
          "&:hover": {
            background: vars.colors.background.secondary,
          },
        },
      },
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
    },
  },

  defaultVariants: {
    maxHeight: "600px",
  },
});

// Scroll Table Inner (실제 스크롤)
export const scrollTableInnerStyles = recipe({
  base: {
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
  },

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
