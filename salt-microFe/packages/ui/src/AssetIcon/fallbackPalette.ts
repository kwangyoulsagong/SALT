/**
 * 로고가 없을 때 이니셜 판 색 — 흰 글자(`text.white`) 대비 **4.5:1 이상**만(이니셜은 10~17px 작은 글자). 불변식은 `fallbackPalette.test.ts`.
 *
 * 2026-11-10 검색 모달 곁 칸 axe 에서 `status.successDark`(#2B8A3E, 4.37:1)가 걸렸다 — 같은 자리(순서)에 `status.warningDark` 를 둬
 * 해시가 고르는 자리는 그대로(다른 이니셜 판 색은 바뀌지 않는다), 초록이던 판만 짙은 노랑이 된다
 */
export interface FallbackPaletteColors {
  brand: { primary: string };
  neutral: { 600: string; 700: string };
  status: { infoDark: string; warningDark: string; errorDark: string };
}

export const fallbackPalette = (colors: FallbackPaletteColors): string[] => [
  colors.brand.primary,
  colors.neutral[600],
  colors.neutral[700],
  colors.status.infoDark,
  colors.status.warningDark,
  colors.status.errorDark,
];
