/**
 * 플랫폼 중립 디자인 토큰 (FE-REQ-007 FR-30).
 *
 * 이 파일은 **순수 TypeScript 객체**다. `@vanilla-extract/css`를 import하지 않는다.
 * - 웹(`@repo/ui`)은 이 객체로 `createGlobalTheme`을 만든다.
 * - React Native(`@repo/ui-native`)는 같은 객체로 `StyleSheet`를 만든다.
 *
 * 값을 바꾸는 곳은 여기 한 곳이다. 웹/RN 어댑터는 값을 재정의하지 않는다.
 */
export const tokens = {
  radius: {
    none: "0",
    xs: "2px",
    small: "4px",
    base: "8px",
    medium: "12px",
    large: "16px",
    xl: "20px",
    full: "9999px",

    // 버튼 크기별 곡률 (FE-REQ-005 D-7)
    button: {
      sm: "8px",
      md: "10px",
      lg: "14px",
      xl: "16px",
    },
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

    // AI/LLM 생성물 전용 액센트 (FE-REQ-005 FR-9)
    // 브랜드 보라와 구분해 "이건 모델이 만든 문장"임을 표시한다.
    // primary 값은 잠정. FE-REQ-005 Open Question 참고.
    ai: {
      primary: "#20C997",
      light: "#63E6BE",
      lighter: "#E6FCF5",
    },

    // 보조 색상 (액션 버튼용)
    action: {
      primary: "#687AD7",
      hover: "#5A6BC4",
      active: "#4C5CB1",
    },

    // 중립 색상 (FE-REQ-005 D-2 — 균등 명도 스케일)
    neutral: {
      50: "#F9FAFB",
      100: "#F2F4F6",
      200: "#E5E8EB",
      300: "#D1D6DB",
      400: "#B0B8C1",
      500: "#8B95A1",
      600: "#6B7684",
      700: "#4E5968",
      800: "#333D4B",
      900: "#191F28",
    },

    // 텍스트 색상
    text: {
      primary: "#191F28",
      secondary: "#2A282F",
      tertiary: "#8B95A1",
      disabled: "#B0B8C1",
      white: "#FFFFFF",
      inverse: "#FFFFFF", // 다크 배경 위의 텍스트
      lightGray: "#6B7684",

      /** @deprecated `text.white`를 사용한다. */
      base: "#FFFFFF",
      /** @deprecated `text.secondary`를 사용한다. */
      nickname: "#2A282F",
      /** @deprecated `text.disabled`를 사용한다. */
      email: "#B0B8C1",
      /** @deprecated `text.primary`를 사용한다. */
      H2: "#191F28",
    },

    // 상태 색상
    status: {
      success: "#51CF66",
      successHover: "#40BB56",
      successLight: "#D3F9D8",
      // *Light 배경 위 전경색. 솔리드 색은 대비가 낮아 작은 글자에 못 쓴다.
      successDark: "#2B8A3E",

      error: "#FF6B6B",
      errorHover: "#E85555",
      errorLight: "#FFE3E3",
      errorDark: "#C92A2A",

      warning: "#FCC419",
      warningHover: "#E8B20E",
      warningLight: "#FFF3BF",
      warningDark: "#7A6000",

      info: "#339AF0",
      infoHover: "#228BE6",
      infoLight: "#D0EBFF",
      infoDark: "#1864AB",
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
      // 상승·하락 (국내 관례). 솔리드는 큰 숫자용,
      // *Light/*Dark 쌍은 틴트 배지용 (FE-REQ-005 Open Question ①안)
      down: "#1677EE",
      downLight: "#E8F2FE",
      downDark: "#0B5BC4",
      up: "#FF2E55",
      upLight: "#FFE9ED",
      upDark: "#C9182F",
    },

    // 테두리 색상
    border: {
      light: "#E5E8EB",
      default: "#D1D6DB",
      dark: "#B0B8C1",
      focus: "#7949FF",
      lightDark: "#E5E8EA",
      black: "#191F28",
    },

    /**
     * @deprecated 완성된 그림자는 `vars.elevation.*`을 사용한다.
     * 색만 필요한 경우에만 남긴다.
     */
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
    // 리스트 행·그룹 헤더 좌우 패딩 (FE-REQ-005 D-5)
    lg2: "20px",
    xl: "24px",
    "2xl": "32px",
    "3xl": "48px",
    "4xl": "64px",
    "5xl": "80px",
    "6xl": "96px",
  },

  /**
   * 완성된 box-shadow (FE-REQ-005 D-4).
   * 카드에는 기본적으로 쓰지 않는다. 실제로 떠 있는 것에만 쓴다.
   */
  elevation: {
    none: "none",
    sm: "0 1px 2px rgba(25,31,40,.04), 0 2px 8px rgba(25,31,40,.04)",
    md: "0 4px 16px rgba(25,31,40,.08)",
    lg: "0 18px 50px rgba(25,31,40,.18)",
    sheet: "0 -8px 30px rgba(25,31,40,.16)",
  },

  /** 숫자 표기 (FE-REQ-005 D-4). 시세·금액은 자리가 흔들리지 않아야 한다. */
  numeric: {
    tabular: "tabular-nums",
  },

  /**
   * size와 line-height를 한 쌍으로 묶은 타입 스케일 (FE-REQ-005 D-3).
   * 신규 컴포넌트는 `fontSizes` 대신 이 그룹을 쓴다.
   */
  typography: {
    /** 30/40 — 총자산·현재가. 화면당 1개 */
    t1: { fontSize: "30px", lineHeight: "40px" },
    /** 26/35 — 큰 금액 */
    t2: { fontSize: "26px", lineHeight: "35px" },
    /** 22/31 — 섹션 대표 숫자 */
    t3: { fontSize: "22px", lineHeight: "31px" },
    /** 20/29 — 화면 제목 */
    t4: { fontSize: "20px", lineHeight: "29px" },
    /** 17/25.5 — 그룹 제목·강조 본문 */
    t5: { fontSize: "17px", lineHeight: "25.5px" },
    /** 15/22.5 — 리스트 행 본문 */
    t6: { fontSize: "15px", lineHeight: "22.5px" },
    /** 13/19.5 — 보조 문자 */
    t7: { fontSize: "13px", lineHeight: "19.5px" },
    /** 11/16.5 — 배지·캡션 */
    t8: { fontSize: "11px", lineHeight: "16.5px" },
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
    tightest: "-0.03em",
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
};

export type Tokens = typeof tokens;
