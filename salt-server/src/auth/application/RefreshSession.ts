import { SessionExpiredError, type TokenIssuer } from "../domain";

/**
 * 토큰 재발급 (`SRV-REQ-008` FR-12).
 *
 * **인증 표면이 줄어도 세션 관리는 남는다.** 초대제로 바뀐 것은 계정이 생기는 방법이고,
 * 이미 있는 세션의 수명은 그것과 무관하다.
 */
export class RefreshSession {
  constructor(private readonly tokens: TokenIssuer) {}

  execute(refreshToken: string): { accessToken: string } {
    const claims = this.tokens.readRefresh(refreshToken);
    if (!claims) throw new SessionExpiredError();

    return { accessToken: this.tokens.issueAccess(claims.userId, claims.email) };
  }
}
