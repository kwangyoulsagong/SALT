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
