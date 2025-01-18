import { createGlobalTheme } from "@vanilla-extract/css";

export const vars = createGlobalTheme(":root", {
  colors: {
    // 주요 배경색
    background: {
      primary: "#F2F4F6",
    },

    // 주요 브랜드/액션 색상
    brand: {
      primary: "#7949FF", // 주요 브랜드/버튼 색상
    },

    // 텍스트 색상
    text: {
      primary: "#FFFFFF",
    },
  },

  space: {
    none: "0",
    small: "4px",
    medium: "8px",
    large: "16px",
    xlarge: "24px",
    xxlarge: "32px",
  },

  fontSizes: {
    small: "12px",
    body: "14px",
    heading3: "16px",
    heading2: "18px",
    heading1: "20px",
    display: "24px",
  },

  fontWeights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
});
