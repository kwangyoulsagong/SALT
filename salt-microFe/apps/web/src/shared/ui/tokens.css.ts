import { createGlobalTheme } from "@vanilla-extract/css";

/**
 * `apps/web` 앱 로컬 토큰 — 통합된 세 앱(shell · goals · investments)의 합집합이다.
 *
 * > **부채.** 이 값들은 `@repo/ui/tokens`(= `@repo/tokens`)와 겹친다. 화면을 디자인 시스템으로
 * > 옮길 때 `@repo/ui/tokens`로 일원화하고 이 파일을 지운다. FE-REQ-007은 zone 재편 범위라
 * > 토큰 이름 매핑까지 하지 않는다.
 */
export const vars = createGlobalTheme(":root", {
  colors: {
    // 주요 배경색
    background: {
      primary: "#F2F4F6",
      third: "#F8F9FA",
    },

    // 주요 브랜드/액션 색상
    brand: {
      primary: "#007AFF", // 주요 브랜드/버튼 색상
    },

    // 상승·하락 (investments)
    extra: {
      down: "#1677EE",
      up: "#FF2E55",
    },

    // 텍스트 색상
    text: {
      base: "#FFFFFF",
      nickname: "#2A282F",
      email: "#A8A6AC",
      primary: "#868E96",
      secondary: "#191F28",
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
    extraHeadding: "30px",
    display: "24px",
  },

  fontWeights: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
});
