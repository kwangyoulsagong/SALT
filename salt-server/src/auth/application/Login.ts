import {
  InvalidCredentialsError,
  type AccountStore,
  type AccountView,
  type PasswordHasher,
  type SessionTokens,
  type TokenIssuer,
} from "../domain";

export interface LoginCommand {
  email: string;
  password: string;
}

export interface LoginResult extends SessionTokens {
  user: Omit<AccountView, "createdAt">;
}

/**
 * 로그인 (`SRV-REQ-008` FR-10). 이관 전 `modules/auth` 와 **응답이 같다**.
 *
 * 이메일이 없는 경우와 비밀번호가 틀린 경우가 같은 예외다 — 구분하면 이메일 존재 여부가
 * 노출된다.
 */
export class Login {
  constructor(
    private readonly accounts: AccountStore,
    private readonly hasher: PasswordHasher,
    private readonly tokens: TokenIssuer
  ) {}

  async execute(cmd: LoginCommand): Promise<LoginResult> {
    const credential = await this.accounts.findCredentialByEmail(cmd.email);
    if (!credential) throw new InvalidCredentialsError();

    const matches = await this.hasher.matches(cmd.password, credential.passwordHash);
    if (!matches) throw new InvalidCredentialsError();

    const account = await this.accounts.findById(credential.id);
    if (!account) throw new InvalidCredentialsError();

    await this.accounts.touchLastLogin(account.id, new Date());

    return {
      user: {
        id: account.id,
        email: account.email,
        nickname: account.nickname,
        profileImageUrl: account.profileImageUrl,
        totalPoints: account.totalPoints,
        userLevel: account.userLevel,
      },
      ...this.tokens.issue(account.id, account.email),
    };
  }
}
