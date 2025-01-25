import { createGlobalTheme, globalFontFace } from "@vanilla-extract/css";
globalFontFace("Inter", {
  src: 'url(https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQsN.woff2) format("woff2")',
});
globalFontFace("Noto Sans KR", {
  src: 'url(https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4gqyIkITq3XeXA.woff2) format("woff2")',
  fontWeight: "100 900",
});
export const vars = createGlobalTheme(":root", {
  radius: {
    base: "8px",
  },

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
      base: "#FFFFFF",
      nickname: "#2A282F",
      email: "#A8A6AC",
      primary: "#868E96",
      H2: "#191F28",
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
    xsmall: "10px",
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
  fontFamily: {
    base: "'Inter', sans-serif",
    secondary: "'Noto Sans KR', sans-serif",
  },
});
