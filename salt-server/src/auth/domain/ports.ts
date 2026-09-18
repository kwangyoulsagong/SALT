import type { AccountCredential, AccountView, NewAccount } from "./Account";
import type { InviteCodeSnapshot, InviteRejection } from "./InviteCode";

/**
 * `auth` 가 밖에 요구하는 것. Port 선언은 **domain 이 한다**.
 *
 * `application` 은 이 타입만 보고 구현이 Prisma 인지 bcrypt 인지 모른다.
 */

export interface InviteCodeStore {
  findByCode(code: string): Promise<InviteCodeSnapshot | null>;
  /**
   * 코드를 점유하면서 **그 코드로 계정을 만든다**. 이미 주인이 있으면 `null`.
   *
   * ## 왜 두 일이 한 연산인가
   *
   * 둘이 나뉘면 사이에 끼어들 자리가 생긴다 — 조회 결과를 믿고 계정을 만든 뒤 점유가
   * 실패하면 **코드 없이 생긴 계정**이 남는다. 그건 이 제품의 전제(마스터 인덱스 §6
   * "초대 코드 없이 계정이 생성되지 않는다")를 깨는 상태이고, 보상 삭제로 지우는 것은
   * 그 삭제가 실패할 수 있는 만큼만 안전하다.
   *
   * 합쳐 두면 **코드 없이 계정을 만드는 함수가 이 컨텍스트에 존재하지 않는다.** FR-5 가
   * "`register` 유스케이스를 만들지 않는다"고 말한 것을 구조로 만든 것이다 — 유스케이스를
   * 안 만드는 것은 규율이고, 함수가 없는 것은 사실이다.
   *
   * 구현은 **원자적이어야 한다**(조건부 UPDATE + 같은 트랜잭션의 INSERT). 어댑터가
   * 임의로 트랜잭션을 여는 것은 `ddd-infrastructure.md` §7 이 막지만, 여기서는
   * **원자성이 Port 계약 자체**다. 이 레포의 첫 트랜잭션이라 근거를 길게 남긴다.
   */
  redeem(
    codeId: string,
    account: NewAccount,
    at: Date
  ): Promise<AccountView | null>;
}

/**
 * 활성 계정 수 (FR-3).
 *
 * **`auth` 도메인이 `User` 테이블을 직접 세지 않는다.** 세는 방법이 바뀌어도(탈퇴 상태
 * 제외 등) 도메인은 그대로다.
 */
export interface UserCountProbe {
  countActive(): Promise<number>;
}

/**
 * 계정 조회. **생성이 없다** — 계정은 `InviteCodeStore.redeem` 으로만 생긴다.
 */
export interface AccountStore {
  existsByEmail(email: string): Promise<boolean>;
  findCredentialByEmail(email: string): Promise<AccountCredential | null>;
  findById(userId: string): Promise<AccountView | null>;
  touchLastLogin(userId: string, at: Date): Promise<void>;
}

/** 비밀번호 해시. 알고리즘은 `infrastructure` 의 판단이다. */
export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  matches(plain: string, hash: string): Promise<boolean>;
}

/** 토큰 발급·검증. 수명과 서명은 `infrastructure` 가 갖는다. */
export interface TokenIssuer {
  issue(userId: string, email: string): { accessToken: string; refreshToken: string };
  issueAccess(userId: string, email: string): string;
  /** 유효하지 않으면 `null`. 예외를 던지지 않는 이유는 만료가 정상 경로이기 때문이다. */
  readRefresh(token: string): { userId: string; email: string } | null;
}

/**
 * 실패한 코드 시도 기록 (FR-7).
 *
 * **실패해도 요청을 막지 않는다.** 기록이 안 됐다고 가입을 거부하면 감사 로그가
 * 가용성을 좌우하게 된다. 구현이 삼키고 로그만 남긴다.
 */
export interface InviteAttemptLog {
  record(attempt: {
    code: string;
    reason: InviteRejection;
    clientKey?: string;
  }): Promise<void>;
}
