import { DomainError, ErrorKind } from "../../shared/domain";

/**
 * `news` 의 도메인 예외.
 *
 * **HTTP status 를 모른다.** `ErrorKind` 만 들고 있고 404 로 옮기는 것은
 * `shared/presentation` 의 에러 미들웨어가 한다 (`ddd-shared.md` §2).
 *
 * > **메시지는 원문 그대로다.** 응답 본문이 달라지면 그건 이관이 아니라 변경이다.
 * > 미들웨어가 `code` 를 **추가**하는 것은 FR-22 가 의도한 것이고, 소비처가 읽는
 * > `success`·`message` 는 그대로다.
 */
export class ArticleNotFoundError extends DomainError {
  constructor() {
    super(
      "NEWS_ARTICLE_NOT_FOUND",
      ErrorKind.NotFound,
      "News article not found"
    );
  }
}

export class BookmarkNotFoundError extends DomainError {
  constructor() {
    super("NEWS_BOOKMARK_NOT_FOUND", ErrorKind.NotFound, "Bookmark not found");
  }
}

/** 기사 본문 — 포털 검색 키가 없어 꺼진 채 기동(`SRV-REQ-054`). 503 — 화면은 요약 · 원문 링크로 */
export class ArticleBodyUnavailableError extends DomainError {
  constructor() {
    super("NEWS_BODY_UNAVAILABLE", ErrorKind.Unavailable, "Article body source is not configured");
  }
}
