import { DomainError, ErrorKind } from "../../shared/domain";

/**
 * `auth` 의 도메인 예외.
 *
 * 초대 실패 4종은 전부 **`Forbidden`(403)** 이다 (`SRV-REQ-009` FR-2). 404 로 나누지 않는
 * 이유는 "없는 코드"와 "이미 쓴 코드"를 status 로 구분해 주면 그 자체가 무차별 대입의
 * 신호가 되기 때문이다 — 구분은 `code` 로만 하고, 어느 쪽이든 같은 403 이다.
 */
export class InviteCodeNotFoundError extends DomainError {
  constructor() {
    super("INVITE_NOT_FOUND", ErrorKind.Forbidden, "초대 코드를 찾을 수 없다");
  }
}

export class InviteCodeAlreadyUsedError extends DomainError {
  constructor() {
    super("INVITE_ALREADY_USED", ErrorKind.Forbidden, "이미 사용된 초대 코드다");
  }
}

export class InviteCodeExpiredError extends DomainError {
  constructor() {
    super("INVITE_EXPIRED", ErrorKind.Forbidden, "만료된 초대 코드다");
  }
}

export class InviteQuotaExceededError extends DomainError {
  constructor() {
    super(
      "INVITE_QUOTA_EXCEEDED",
      ErrorKind.Forbidden,
      "가입 가능한 인원이 모두 찼다"
    );
  }
}

/**
 * 코드를 점유하려는 순간 남이 먼저 가져간 경우 (FR-4).
 *
 * `InviteCodeAlreadyUsedError` 와 의미가 같지만 **경로가 다르다** — 이쪽은 검증을 통과한
 * 뒤 조건부 UPDATE 가 0행을 돌려준 경우다. 같은 `code` 를 주는 이유는 화면이 구분할 필요가
 * 없어서이고, 나뉘어 있는 이유는 **동시 사용이 실제로 일어났다는 사실**이 로그에 남아야
 * 하기 때문이다.
 */
export class InviteCodeRaceLostError extends DomainError {
  constructor() {
    super("INVITE_ALREADY_USED", ErrorKind.Forbidden, "이미 사용된 초대 코드다");
  }
}

export class EmailAlreadyRegisteredError extends DomainError {
  constructor() {
    super("AUTH_EMAIL_TAKEN", ErrorKind.Conflict, "이미 가입된 이메일이다");
  }
}

/**
 * 로그인 실패 — **이메일이 없는 것과 비밀번호가 틀린 것을 구분하지 않는다.**
 * 구분하면 이메일 존재 여부가 노출된다 (`auth-security.md`).
 */
export class InvalidCredentialsError extends DomainError {
  constructor() {
    super(
      "AUTH_INVALID_CREDENTIALS",
      ErrorKind.Unauthenticated,
      "Invalid credentials"
    );
  }
}

export class SessionExpiredError extends DomainError {
  constructor() {
    super(
      "AUTH_SESSION_EXPIRED",
      ErrorKind.Unauthenticated,
      "Invalid refresh token"
    );
  }
}

export class AccountNotFoundError extends DomainError {
  constructor() {
    super(
      "AUTH_ACCOUNT_NOT_FOUND",
      ErrorKind.Unauthenticated,
      "User not found"
    );
  }
}
