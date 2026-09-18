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
 * 한글 뉴스 소스 — **고정 이름 넷과 수집기 접두사 하나**.
 *
 * ## 이 목록만으로는 아무것도 분류하지 못했다 (2026-09-18 수정)
 *
 * 한글 수집기(`KoreanNewsFeed`)가 저장하는 `source` 는 `GoogleNews(비트코인)` 처럼
 * **키워드가 붙은 형태**라 아래 네 이름 중 어느 것과도 같지 않았다. 그래서
 * `language: "ko"` 가 **항상 0건**이었다 — 이관 시점(`SRV-REQ-006` 3단계)에는
 * HTTP 로 `language` 를 넘기는 경로조차 없어 도달 불가 코드였다.
 *
 * 고칠 때 선택지는 둘이었다:
 *
 * | 안 | 문제 |
 * |---|---|
 * | 저장하는 이름을 네 값 중 하나로 바꾼다 | **이미 저장된 기사**가 분류에서 빠진다. 과거 데이터를 고치는 일이 된다 |
 * | **분류하는 쪽이 접두사를 안다** | 선택. 저장된 값을 건드리지 않는다 |
 *
 * 값을 늘릴 때는 **저장하는 쪽과 분류하는 쪽이 같은 규칙**을 보게 한다.
 */
export const KOREAN_SOURCES = [
  "토큰포스트",
  "비인크립토",
  "블록미디어",
  "코인리더스",
] as const;

/**
 * 한글 수집기가 붙이는 접두사.
 *
 * `KoreanNewsFeed` 의 `GoogleNews(${keyword})` 와 **같은 규칙**이어야 한다.
 * 키워드가 계속 늘어나므로 전체 이름을 목록으로 들 수 없다.
 */
export const KOREAN_SOURCE_PREFIXES = ["GoogleNews("] as const;

export const isKoreanSource = (source: string): boolean =>
  (KOREAN_SOURCES as readonly string[]).includes(source) ||
  KOREAN_SOURCE_PREFIXES.some((prefix) => source.startsWith(prefix));
