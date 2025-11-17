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
    none: "0",
    small: "4px",
    base: "8px",
    medium: "12px",
    large: "16px",
    full: "9999px", // 원형
  },

  colors: {
    // 주요 배경색
    background: {
      primary: "#F2F4F6",
      bankAccount: "#F8F9FA",
      submit: "#687AD7",
      white: "#FFFFFF",
    },

    // 주요 브랜드/액션 색상
    brand: {
      primary: "#7949FF",
      hover: "#6339E6", // 호버 상태 추가
      active: "#5329CC", // 활성 상태 추가
    },

    // 텍스트 색상
    text: {
      base: "#FFFFFF",
      primary: "#191F28", // H2와 통합
      secondary: "#2A282F", // nickname
      tertiary: "#868E96",
      disabled: "#A8A6AC", // email

      // 기존 호환성 유지 (deprecated)
      nickname: "#2A282F",
      email: "#A8A6AC",
      H2: "#191F28",
    },

    // 상태 색상 (선택사항)
    status: {
      success: "#51CF66",
      error: "#FF6B6B",
      warning: "#FCC419",
      info: "#339AF0",
    },
  },

  space: {
    none: "0",
    xs: "4px",
    sm: "8px",
    md: "12px",
    lg: "16px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "48px",
    "4xl": "64px",
  },

  fontSizes: {
    xs: "10px",
    sm: "12px",
    base: "14px",
    md: "14px",
    lg: "16px",
    xl: "18px",
    "2xl": "20px",
    "3xl": "24px",
    "4xl": "32px",
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
