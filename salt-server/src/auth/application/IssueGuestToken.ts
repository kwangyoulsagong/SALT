import { GuestAccessDisabledError, type GuestTokenIssuer } from "../domain";

/**
 * 게스트 토큰 발급(`SRV-REQ-056` FR-1 · `ADR-011`) — 로그인 없이 시장 데이터를 읽게 한다.
 * 공개가 꺼져 있으면(`PUBLIC_MARKET_GUEST=false`) 거절 — 되돌리는 한 줄이다.
 */
export class IssueGuestToken {
  constructor(
    private readonly tokens: GuestTokenIssuer,
    private readonly enabled: boolean
  ) {}

  execute(): { guestToken: string; expiresIn: number } {
    if (!this.enabled) throw new GuestAccessDisabledError();
    return this.tokens.issueGuest();
  }
}
