import type { Metadata } from "next";

/** 검색 결과 · 공유 미리보기에 나가는 사이트 이름과 한 줄 소개 */
export const SITE_NAME = "SALT";
export const SITE_TAGLINE = "AI 투자 코치";
export const SITE_DESCRIPTION =
  "근거 · 과거 적중률 · 틀렸던 사례를 함께 보여 주는 AI 투자 코치. 코인 시세와 차트, 내 규칙 기반 가격을 한 화면에서 봅니다.";

/**
 * 로그인한 사람의 데이터가 있는 페이지 — 검색에 싣지 않는다.
 * `robots.txt` 의 disallow 와 **둘 다** 둔다: disallow 만으로는 외부 링크로 들어온 주소가 색인될 수 있다.
 */
export const privatePageMetadata = (title: string): Metadata => ({
  title,
  robots: { index: false, follow: false },
});
