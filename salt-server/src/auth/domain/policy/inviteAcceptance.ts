import { InviteCode, type InviteRejection } from "../InviteCode";

/**
 * 초대 수락 판정 — **코드 상태와 계정 상한을 합치는 유일한 자리** (`SRV-REQ-008` FR-1).
 *
 * ## 왜 policy 인가
 *
 * 판정에 필요한 사실이 둘이고 주인이 다르다: 코드 자신의 상태(`InviteCode` Aggregate)와
 * **전체 계정 수**(코드가 알 수 없는 것). 둘을 합치는 규칙을 어느 한쪽에 넣으면 그쪽이
 * 남의 사실을 알게 된다 (`ddd-domain.md` — "여러 Aggregate 에 걸친 규칙은 Domain Service").
 *
 * ## 순서가 규칙이다
 *
 * **코드 판정이 먼저다.** 상한을 먼저 보면 정원이 찼을 때 잘못된 코드도 `quota` 로
 * 답하게 되고, 그건 `check` 가 상한을 노출하지 않는다는 요구(`SRV-REQ-009` FR-4)를
 * 우회로 깨뜨린다 — 공격자가 아무 코드나 넣어 정원 상태를 읽을 수 있다.
 */
export interface InviteAcceptanceInput {
  invite: InviteCode | null;
  now: Date;
  activeUserCount: number;
  maxAccounts: number;
}

export const judgeInviteAcceptance = ({
  invite,
  now,
  activeUserCount,
  maxAccounts,
}: InviteAcceptanceInput): InviteRejection | null => {
  if (!invite) return "not_found";

  const rejection = invite.rejectionAt(now);
  if (rejection) return rejection;

  if (activeUserCount >= maxAccounts) return "quota";

  return null;
};

/**
 * `check` 가 내보내도 되는 이유만 남긴다 (`SRV-REQ-009` FR-4).
 *
 * `quota` 는 **코드와 무관한 서비스 상태**다. 무인증 경로가 그것을 답하면 정원이 찼는지를
 * 누구나 폴링할 수 있고, 그건 코드를 맞히는 것보다 값싼 정보다.
 */
export const publicRejectionOf = (
  rejection: InviteRejection | null
): Exclude<InviteRejection, "quota"> | null =>
  rejection === "quota" || rejection === null ? null : rejection;
