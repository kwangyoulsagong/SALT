import { createGlobalTheme, globalFontFace } from "@vanilla-extract/css";

globalFontFace("Inter", {
  src: 'url(https://fonts.gstatic.com/s/inter/v13/UcC73FwrK3iLTeHuS_fvQsN.woff2) format("woff2")',
  fontDisplay: "swap",
});

globalFontFace("Noto Sans KR", {
  src: 'url(https://fonts.gstatic.com/s/notosanskr/v36/PbykFmXiEBPT4gqyIkITq3XeXA.woff2) format("woff2")',
  fontWeight: "100 900",
  fontDisplay: "swap",
});

export const vars = createGlobalTheme(":root", {
  radius: {
    none: "0",
    xs: "2px",
    small: "4px",
    base: "8px",
    medium: "12px",
    large: "16px",
    xl: "20px",
    full: "9999px",
  },

  colors: {
    // 배경색
    background: {
      primary: "#F2F4F6",
      secondary: "#F8F9FA",
      tertiary: "#F0F1F3",
      white: "#FFFFFF",
      dark: "#191F28",
      gray: "#F2F4F5",
    },

    // 브랜드 색상
    brand: {
      primary: "#7949FF",
      hover: "#6339E6",
      active: "#5329CC",
      light: "#9B7FFF",
      lighter: "#E5DBFF",
    },

    // 보조 색상 (액션 버튼용)
    action: {
      primary: "#687AD7",
      hover: "#5A6BC4",
      active: "#4C5CB1",
    },

    // 중립 색상
    neutral: {
      50: "#F8F9FA",
      100: "#F0F1F3",
      200: "#E1E3E6",
      300: "#C8CCD1",
      400: "#A8A6AC",
      500: "#868E96",
      600: "#495057",
      700: "#343A40",
      800: "#212529",
      900: "#191F28",
    },

    // 텍스트 색상
    text: {
      primary: "#191F28",
      secondary: "#2A282F",
      tertiary: "#868E96",
      disabled: "#A8A6AC",
      white: "#FFFFFF",
      inverse: "#FFFFFF", // 다크 배경 위의 텍스트
      lightGray: "#66727C",

      // 기존 호환성 유지 (deprecated)
      base: "#FFFFFF",
      nickname: "#2A282F",
      email: "#A8A6AC",
      H2: "#191F28",
    },

    // 상태 색상
    status: {
      success: "#51CF66",
      successHover: "#40BB56",
      successLight: "#D3F9D8",

      error: "#FF6B6B",
      errorHover: "#E85555",
      errorLight: "#FFE3E3",

      warning: "#FCC419",
      warningHover: "#E8B20E",
      warningLight: "#FFF3BF",

      info: "#339AF0",
      infoHover: "#228BE6",
      infoLight: "#D0EBFF",
    },

    // 특수 용도 색상
    special: {
      orange: "#F59D71",
      orangeHover: "#E88D61",
      orangeLight: "#FFE8DB",

      purple: "#7949FF",
      purpleHover: "#6339E6",
      purpleLight: "#E5DBFF",

      pink: "#FF6BCF",
      pinkHover: "#E85BB7",
      pinkLight: "#FFE3F5",

      teal: "#20C997",
      tealHover: "#12B886",
      tealLight: "#C3FAE8",
      down: "#1677EE",
      up: "#FF2E55",
    },

    // 테두리 색상
    border: {
      light: "#E1E3E6",
      default: "#C8CCD1",
      dark: "#A8A6AC",
      focus: "#7949FF",
      lightDark: "#E5E8EA",
      black: "#191F28",
    },

    // 그림자 (투명도 포함)
    shadow: {
      sm: "rgba(0, 0, 0, 0.05)",
      md: "rgba(0, 0, 0, 0.1)",
      lg: "rgba(0, 0, 0, 0.15)",
      xl: "rgba(0, 0, 0, 0.2)",
    },

    // 오버레이
    overlay: {
      light: "rgba(0, 0, 0, 0.1)",
      medium: "rgba(0, 0, 0, 0.3)",
      dark: "rgba(0, 0, 0, 0.5)",
      darker: "rgba(0, 0, 0, 0.7)",
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
    "5xl": "80px",
    "6xl": "96px",
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
    "5xl": "40px",
    "6xl": "48px",
  },

  fontWeights: {
    light: "300",
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
    extrabold: "800",
  },

  fontFamily: {
    base: "'Inter', 'Noto Sans KR', sans-serif",
    sans: "'Inter', sans-serif",
    korean: "'Noto Sans KR', sans-serif",

    // 기존 호환성 유지
    secondary: "'Noto Sans KR', sans-serif",
  },

  lineHeights: {
    tight: "1.2",
    snug: "1.3",
    normal: "1.5",
    relaxed: "1.75",
    loose: "2",
  },

  letterSpacings: {
    tighter: "-0.05em",
    tight: "-0.02em",
    normal: "0",
    wide: "0.02em",
    wider: "0.05em",
  },

  transitions: {
    fast: "0.1s ease",
    base: "0.2s ease",
    slow: "0.3s ease",
    slower: "0.5s ease",
  },

  zIndices: {
    base: "0",
    dropdown: "1000",
    sticky: "1100",
    fixed: "1200",
    modalBackdrop: "1300",
    modal: "1400",
    popover: "1500",
    tooltip: "1600",
  },
});
