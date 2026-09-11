/**
 * 뉴스 소스와 언어 분류 — `news` 컨텍스트의 유일한 분류 규칙.
 *
 * ## 왜 도메인인가
 *
 * 원문(`modules/news/news.service.ts`)은 **한글 소스 이름 배열을 네 곳에 복사**해 두고
 * 각자 `in` / `notIn` 으로 뒤집어 썼다. 한 소스를 추가하면 네 곳을 고쳐야 하고,
 * 실제로 `getNewsSources()` 의 분류와 `getNews()` 의 필터가 따로 놀 수 있었다.
 *
 * 목록이 하나이고 분류가 함수 하나면 그 어긋남이 성립하지 않는다.
 */

/** 언어 필터. `all` 은 필터를 걸지 않는다는 뜻이다. */
export type NewsLanguage = "ko" | "en" | "all";

/**
 * 한글 뉴스 소스.
 *
 * > **이 목록은 지금 아무것도 분류하지 못한다.** 한글 수집기(`KoreanRssFeed`)가 저장하는
 * > `source` 는 `GoogleNews(비트코인)` 형태이고 이 목록의 어느 값과도 같지 않다.
 * > 즉 `language: "ko"` 는 항상 0건이다.
 * >
 * > 이관하면서 고치지 않았다. HTTP 로 `language` 를 넘기는 경로가 **없어서**(컨트롤러가
 * > 그 쿼리를 읽지 않는다) 지금은 도달 불가 코드이고, 값을 맞추는 순간 **없던 필터가
 * > 갑자기 동작한다** — 그건 이관이 아니라 기능 변경이다. `SRV-REQ-007`(서버 정리)이
 * > 이 필터를 살릴지 지울지 정한다.
 *
 * 값을 고칠 때는 **저장하는 쪽과 분류하는 쪽이 같은 문자열**이 되게 한다.
 */
export const KOREAN_SOURCES = [
  "토큰포스트",
  "비인크립토",
  "블록미디어",
  "코인리더스",
] as const;

export const isKoreanSource = (source: string): boolean =>
  (KOREAN_SOURCES as readonly string[]).includes(source);
