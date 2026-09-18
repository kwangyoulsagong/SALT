/**
 * 도메인 예외 기반 타입 — **전역 에러 미들웨어가 성립하는 근거**다 (`ddd-shared.md` §2).
 *
 * 미들웨어는 `shared/presentation` 에 하나만 있는데, 컨텍스트별 예외를 import 하면
 * 훅이 막는다(shared 는 컨텍스트를 모른다). 그래서 **컨텍스트 예외가 이 타입을 상속하고
 * `code` 를 들고 온다.**
 *
 * **도메인은 HTTP status 를 알지 않는다.** `ErrorKind` 는 의미 분류이고,
 * 그것을 404/409/400 으로 옮기는 것은 `presentation` 의 판단이다.
 */
export enum ErrorKind {
  NotFound = "NOT_FOUND",
  Conflict = "CONFLICT",
  Invalid = "INVALID",
  Blocked = "BLOCKED",
  /**
   * 남의 리소스에 손대려 한 경우 → 403.
   *
   * **`SRV-REQ-006` FR-22 는 네 값만 적었다.** 다섯째를 넣은 이유: 사용자 소유 검사가
   * 전 컨텍스트에 걸리고(`auth-security.md` — "사용자 리소스 접근은 인증된 `userId`
   * 기준으로 제한한다") 그 응답은 이미 403 이다. 없으면 선택지가 둘뿐이었다 —
   * `Blocked`(422)로 **응답 코드를 바꾸거나**, `domain` 이 `shared/presentation` 의
   * `ForbiddenError` 를 import 해서 **레이어 규칙을 깨는 것**(`ddd-domain.md` 허용
   * 목록에 `shared/presentation` 이 없다).
   *
   * 둘 다 이관이 조용히 계약이나 규칙을 바꾸는 것이라 커널에 값을 하나 늘렸다.
   */
  Forbidden = "FORBIDDEN",
  /**
   * 신원이 확인되지 않았다 → 401.
   *
   * **`Forbidden`(403)과 나뉘어 있어야 하는 이유**: 403 은 "누구인지는 알지만 이건 안
   * 된다"이고 401 은 "누구인지 모른다"다. 클라이언트가 토큰 재발급을 시도할지 판단하는
   * 근거가 이 구분이다 — 로그인 실패·토큰 만료를 403 으로 올리면 재발급 루프가 돌거나
   * 반대로 만료된 세션이 조용히 방치된다.
   *
   * `auth` 컨텍스트가 서면서 `modules/auth` 의 `UnauthorizedError`(401)를 도메인 예외로
   * 옮겨야 했고, 커널에 값이 없으면 **이관이 응답 코드를 바꾸는 일**이 된다.
   */
  Unauthenticated = "UNAUTHENTICATED",
}

export abstract class DomainError extends Error {
  constructor(
    readonly code: string,
    readonly kind: ErrorKind,
    message: string
  ) {
    super(message);
    this.name = new.target.name;
    Error.captureStackTrace?.(this, new.target);
  }
}

export const isDomainError = (error: unknown): error is DomainError =>
  error instanceof DomainError;
