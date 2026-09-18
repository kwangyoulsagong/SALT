import {
  InviteCode,
  judgeInviteAcceptance,
  normalizeInviteCode,
  publicRejectionOf,
  type InviteCodeStore,
  type InviteRejection,
  type UserCountProbe,
} from "../domain";

export interface InviteCheckResult {
  valid: boolean;
  /** 거절 사유. **`quota` 는 나오지 않는다** (`SRV-REQ-009` FR-4). */
  reasonCode?: Exclude<InviteRejection, "quota">;
}

/**
 * 코드 유효성만 답한다 — **계정을 만들지 않는다** (`SRV-REQ-009` FR-3).
 *
 * 화면이 입력 중에 부르는 무인증 경로라 두 가지를 지킨다:
 * 1. **상한 초과를 노출하지 않는다.** 정원이 찼는지는 코드와 무관한 서비스 상태다
 * 2. 요청 제한을 건다 (라우터가 건다 — 여기서는 판정만)
 *
 * 그래서 정원이 찼어도 멀쩡한 코드에는 `valid: true` 를 준다. 실제 차단은
 * `AcceptInviteCode` 가 하고, 그 응답은 `INVITE_QUOTA_EXCEEDED` 다.
 */
export class CheckInviteCode {
  constructor(
    private readonly invites: InviteCodeStore,
    private readonly userCount: UserCountProbe,
    private readonly maxAccounts: number
  ) {}

  async execute(rawCode: string): Promise<InviteCheckResult> {
    const code = normalizeInviteCode(rawCode);
    if (!code) return { valid: false, reasonCode: "not_found" };

    const snapshot = await this.invites.findByCode(code);

    const rejection = judgeInviteAcceptance({
      invite: snapshot ? InviteCode.from(snapshot) : null,
      now: new Date(),
      // 상한 판정을 타지 않게 한다. 같은 policy 를 쓰면서 이 경로만 `quota` 를
      // 만들지 않는 방법이고, 결과를 지우는 것(`publicRejectionOf`)과 이중으로 막는다.
      activeUserCount: 0,
      maxAccounts: this.maxAccounts,
    });

    const publicReason = publicRejectionOf(rejection);
    return publicReason ? { valid: false, reasonCode: publicReason } : { valid: true };
  }
}
