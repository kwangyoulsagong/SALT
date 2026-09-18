/**
 * 초대 코드 — `auth` 의 Aggregate.
 *
 * ## 왜 Aggregate 인가
 *
 * 지킬 불변식이 있다: **한 코드는 한 번만 쓰이고, 만료 뒤에는 쓰이지 않는다.** 그 판정이
 * 코드 자신의 상태(`usedByUserId`·`expiresAt`)만으로 끝나므로 경계가 자기 자신이다.
 * 계정 상한은 코드 밖의 사실이라 여기 들어오지 않는다 — `policy/inviteAcceptance` 가
 * 둘을 합친다 (`ddd-domain.md` — "여러 Aggregate 에 걸친 규칙은 policy").
 */

/** 저장된 초대 코드의 도메인 표현. DB row 가 아니라 이 타입이 도메인의 입력이다. */
export interface InviteCodeSnapshot {
  id: string;
  code: string;
  expiresAt: Date;
  usedByUserId: string | null;
}

/** 코드가 쓰일 수 없는 이유. `check` 와 `accept` 가 같은 값을 쓴다. */
export type InviteRejection = "not_found" | "used" | "expired" | "quota";

export class InviteCode {
  private constructor(private readonly snapshot: InviteCodeSnapshot) {}

  static from(snapshot: InviteCodeSnapshot): InviteCode {
    return new InviteCode(snapshot);
  }

  get id(): string {
    return this.snapshot.id;
  }

  get code(): string {
    return this.snapshot.code;
  }

  /**
   * 코드 **자신의** 상태로 판정한다. 통과면 `null`.
   *
   * 상한(`quota`)은 여기서 나오지 않는다 — 코드는 몇 명이 가입했는지 모른다.
   */
  rejectionAt(now: Date): InviteRejection | null {
    if (this.snapshot.usedByUserId !== null) return "used";
    if (this.snapshot.expiresAt.getTime() <= now.getTime()) return "expired";
    return null;
  }
}

/**
 * 코드 정규화 — 입력 그대로 조회하지 않는다.
 *
 * 붙여넣기에 공백·줄바꿈이 섞이고 소문자로 오는 경우가 실제로 많다(`FE-REQ-010` FR-26 이
 * 화면에서도 같은 것을 한다). **정규화 규칙이 두 곳에 있으면 한쪽만 고쳐진다** — 화면은
 * 보여주기 위해 하고, 최종 판정은 여기서 한 값으로 한다.
 */
export const normalizeInviteCode = (raw: string): string =>
  raw.replace(/\s+/g, "").toUpperCase();
