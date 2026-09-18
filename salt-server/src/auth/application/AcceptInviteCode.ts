import {
  EmailAlreadyRegisteredError,
  InviteCode,
  InviteCodeAlreadyUsedError,
  InviteCodeExpiredError,
  InviteCodeNotFoundError,
  InviteCodeRaceLostError,
  InviteQuotaExceededError,
  judgeInviteAcceptance,
  normalizeInviteCode,
  type AccountStore,
  type InviteAttemptLog,
  type InviteCodeStore,
  type InviteRejection,
  type PasswordHasher,
  type SessionTokens,
  type TokenIssuer,
  type UserCountProbe,
  type AccountView,
} from "../domain";

export interface AcceptInviteCodeCommand {
  code: string;
  email: string;
  nickname: string;
  password: string;
  /** 실패 기록용. IP 또는 그에 준하는 식별자이고, 없어도 진행한다. */
  clientKey?: string;
}

export interface AcceptInviteCodeResult extends SessionTokens {
  user: AccountView;
}

/**
 * 초대 코드로 계정을 만든다 — **계정이 생기는 유일한 경로** (`SRV-REQ-008` FR-1·FR-5).
 *
 * 판정은 `policy/inviteAcceptance` 가 하고 여기서는 조합만 한다. 상한은 생성자로 받는다
 * (FR-6 — 코드 상수 금지).
 */
export class AcceptInviteCode {
  constructor(
    private readonly invites: InviteCodeStore,
    private readonly accounts: AccountStore,
    private readonly userCount: UserCountProbe,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer,
    private readonly attempts: InviteAttemptLog,
    private readonly maxAccounts: number
  ) {}

  async execute(cmd: AcceptInviteCodeCommand): Promise<AcceptInviteCodeResult> {
    const code = normalizeInviteCode(cmd.code);
    const now = new Date();

    const [snapshot, activeUserCount] = await Promise.all([
      this.invites.findByCode(code),
      this.userCount.countActive(),
    ]);

    const rejection = judgeInviteAcceptance({
      invite: snapshot ? InviteCode.from(snapshot) : null,
      now,
      activeUserCount,
      maxAccounts: this.maxAccounts,
    });

    if (rejection) {
      await this.attempts.record({ code, reason: rejection, clientKey: cmd.clientKey });
      throw rejectionToError(rejection);
    }

    // 코드가 멀쩡한데 이메일이 겹치는 경우다. **코드를 소모시키지 않는다** — 오타 한 번에
    // 초대장이 사라지면 10장뿐인 자원이 사용자 실수로 줄어든다.
    if (await this.accounts.existsByEmail(cmd.email)) {
      throw new EmailAlreadyRegisteredError();
    }

    const passwordHash = await this.hasher.hash(cmd.password);

    // 검증과 점유 사이에 남이 끼어들 수 있다. 조건부 점유가 **유일한** 방어선이고,
    // 위 판정은 빠른 거절일 뿐이다 (FR-4).
    const user = await this.invites.redeem(
      snapshot!.id,
      { email: cmd.email, nickname: cmd.nickname, passwordHash },
      now
    );

    if (!user) {
      await this.attempts.record({ code, reason: "used", clientKey: cmd.clientKey });
      throw new InviteCodeRaceLostError();
    }

    return { user, ...this.tokens.issue(user.id, user.email) };
  }
}

/**
 * 거절 사유 → 도메인 예외. 판정과 예외를 나눠 둔 이유는 `check` 가 **같은 판정을 쓰되
 * 예외를 던지지 않기** 때문이다.
 */
const rejectionToError = (rejection: InviteRejection) => {
  switch (rejection) {
    case "not_found":
      return new InviteCodeNotFoundError();
    case "used":
      return new InviteCodeAlreadyUsedError();
    case "expired":
      return new InviteCodeExpiredError();
    case "quota":
      return new InviteQuotaExceededError();
  }
};
