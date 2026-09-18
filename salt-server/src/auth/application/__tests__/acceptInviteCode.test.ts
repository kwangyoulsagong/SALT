import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type {
  AccountStore,
  AccountView,
  InviteAttemptLog,
  InviteCodeSnapshot,
  InviteCodeStore,
  InviteRejection,
  NewAccount,
  PasswordHasher,
  TokenIssuer,
  UserCountProbe,
} from "../../domain";
import { AcceptInviteCode } from "../AcceptInviteCode";
import { CheckInviteCode } from "../CheckInviteCode";

const FUTURE = new Date("2027-01-01T00:00:00.000Z");

const accountOf = (id: string): AccountView => ({
  id,
  email: `${id}@example.com`,
  nickname: id,
  profileImageUrl: null,
  totalPoints: 0,
  userLevel: 1,
  createdAt: new Date(),
});

/**
 * 코드 한 장을 들고 있는 가짜 저장소.
 *
 * `redeem` 이 **조건부 UPDATE 를 흉내낸다** — 이미 주인이 있으면 `null` 이다. 실제 원자성은
 * Postgres 가 주지만, 유스케이스가 그 `null` 을 **어떻게 다루는지**는 여기서만 검증할 수 있다.
 */
class FakeInviteStore implements InviteCodeStore {
  redeemCalls = 0;
  constructor(private snapshot: InviteCodeSnapshot | null) {}

  async findByCode(code: string) {
    return this.snapshot && this.snapshot.code === code ? { ...this.snapshot } : null;
  }

  async redeem(codeId: string, account: NewAccount) {
    this.redeemCalls += 1;
    if (!this.snapshot || this.snapshot.id !== codeId) return null;
    if (this.snapshot.usedByUserId !== null) return null;

    this.snapshot = { ...this.snapshot, usedByUserId: account.nickname };
    return accountOf(account.nickname);
  }
}

class FakeAccountStore implements AccountStore {
  constructor(private readonly takenEmails: string[] = []) {}
  async existsByEmail(email: string) {
    return this.takenEmails.includes(email);
  }
  async findCredentialByEmail() {
    return null;
  }
  async findById() {
    return null;
  }
  async touchLastLogin() {}
}

const hasher: PasswordHasher = {
  async hash(plain) {
    return `hashed:${plain}`;
  },
  async matches() {
    return true;
  },
};

const tokens: TokenIssuer = {
  issue: (userId) => ({ accessToken: `a:${userId}`, refreshToken: `r:${userId}` }),
  issueAccess: (userId) => `a:${userId}`,
  readRefresh: () => null,
};

const countProbe = (count: number): UserCountProbe => ({
  async countActive() {
    return count;
  },
});

class RecordingAttemptLog implements InviteAttemptLog {
  readonly reasons: InviteRejection[] = [];
  async record(attempt: { reason: InviteRejection }) {
    this.reasons.push(attempt.reason);
  }
}

const buildAccept = (
  invites: InviteCodeStore,
  options: {
    users?: number;
    max?: number;
    takenEmails?: string[];
    attempts?: InviteAttemptLog;
  } = {}
) =>
  new AcceptInviteCode(
    invites,
    new FakeAccountStore(options.takenEmails ?? []),
    countProbe(options.users ?? 0),
    hasher,
    tokens,
    options.attempts ?? new RecordingAttemptLog(),
    options.max ?? 10
  );

const command = (nickname: string) => ({
  code: "saltaaaa",
  email: `${nickname}@example.com`,
  nickname,
  password: "password123",
});

describe("AcceptInviteCode", () => {
  it("유효한 코드로 계정과 토큰을 만든다", async () => {
    const invites = new FakeInviteStore({
      id: "inv-1",
      code: "SALTAAAA",
      expiresAt: FUTURE,
      usedByUserId: null,
    });

    const result = await buildAccept(invites).execute(command("moomin"));

    assert.equal(result.user.id, "moomin");
    assert.equal(result.accessToken, "a:moomin");
  });

  /**
   * **FR-4.** 두 요청이 같은 코드로 동시에 들어오면 하나만 성공해야 한다.
   *
   * 둘 다 검증을 통과한다 — 그게 이 테스트의 핵심이다. 검증은 빠른 거절일 뿐이고
   * 실제 방어선은 `redeem` 의 조건부 점유다.
   */
  it("같은 코드를 동시에 쓰면 **하나만** 성공한다", async () => {
    const invites = new FakeInviteStore({
      id: "inv-1",
      code: "SALTAAAA",
      expiresAt: FUTURE,
      usedByUserId: null,
    });
    const accept = buildAccept(invites);

    const results = await Promise.allSettled([
      accept.execute(command("first")),
      accept.execute(command("second")),
    ]);

    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    assert.equal(invites.redeemCalls, 2, "둘 다 점유를 시도해야 한다");
    assert.equal(
      (rejected[0] as PromiseRejectedResult).reason.code,
      "INVITE_ALREADY_USED"
    );
  });

  it("정원이 차면 INVITE_QUOTA_EXCEEDED 이고 코드를 쓰지 않는다", async () => {
    const invites = new FakeInviteStore({
      id: "inv-1",
      code: "SALTAAAA",
      expiresAt: FUTURE,
      usedByUserId: null,
    });

    await assert.rejects(
      () => buildAccept(invites, { users: 10, max: 10 }).execute(command("late")),
      (error: { code: string }) => error.code === "INVITE_QUOTA_EXCEEDED"
    );
    assert.equal(invites.redeemCalls, 0);
  });

  it("상한은 **주입값**이다 — 12 로 올리면 11번째가 들어온다", async () => {
    const invites = new FakeInviteStore({
      id: "inv-1",
      code: "SALTAAAA",
      expiresAt: FUTURE,
      usedByUserId: null,
    });

    const result = await buildAccept(invites, { users: 10, max: 12 }).execute(
      command("eleventh")
    );

    assert.equal(result.user.id, "eleventh");
  });

  /**
   * 초대장은 10장뿐인 자원이다. 이메일 오타 한 번에 한 장이 사라지면 안 된다.
   */
  it("이미 가입된 이메일이면 **코드를 소모하지 않는다**", async () => {
    const invites = new FakeInviteStore({
      id: "inv-1",
      code: "SALTAAAA",
      expiresAt: FUTURE,
      usedByUserId: null,
    });

    await assert.rejects(
      () =>
        buildAccept(invites, { takenEmails: ["dup@example.com"] }).execute({
          ...command("dup"),
          email: "dup@example.com",
        }),
      (error: { code: string }) => error.code === "AUTH_EMAIL_TAKEN"
    );
    assert.equal(invites.redeemCalls, 0);
  });

  it("실패한 시도를 사유와 함께 기록한다 (FR-7)", async () => {
    const attempts = new RecordingAttemptLog();

    await assert.rejects(() =>
      buildAccept(new FakeInviteStore(null), { attempts }).execute(command("ghost"))
    );

    assert.deepEqual(attempts.reasons, ["not_found"]);
  });
});

describe("CheckInviteCode", () => {
  const validSnapshot = {
    id: "inv-1",
    code: "SALTAAAA",
    expiresAt: FUTURE,
    usedByUserId: null,
  };

  it("멀쩡한 코드는 valid 다", async () => {
    const check = new CheckInviteCode(new FakeInviteStore(validSnapshot), countProbe(0), 10);

    assert.deepEqual(await check.execute(" salt aaaa "), { valid: true });
  });

  it("사유 3종을 구분한다", async () => {
    const used = new CheckInviteCode(
      new FakeInviteStore({ ...validSnapshot, usedByUserId: "u-1" }),
      countProbe(0),
      10
    );
    const expired = new CheckInviteCode(
      new FakeInviteStore({ ...validSnapshot, expiresAt: new Date("2020-01-01") }),
      countProbe(0),
      10
    );
    const missing = new CheckInviteCode(new FakeInviteStore(null), countProbe(0), 10);

    assert.deepEqual(await used.execute("SALTAAAA"), { valid: false, reasonCode: "used" });
    assert.deepEqual(await expired.execute("SALTAAAA"), {
      valid: false,
      reasonCode: "expired",
    });
    assert.deepEqual(await missing.execute("SALTAAAA"), {
      valid: false,
      reasonCode: "not_found",
    });
  });

  /**
   * **FR-4.** 정원이 찬 상태에서 멀쩡한 코드를 물으면 `valid: true` 다.
   * `quota` 를 여기서 답하면 아무나 정원 상태를 폴링할 수 있다 — 차단은 `accept` 가 한다.
   */
  it("정원이 차도 **quota 를 노출하지 않는다**", async () => {
    const check = new CheckInviteCode(new FakeInviteStore(validSnapshot), countProbe(10), 10);

    assert.deepEqual(await check.execute("SALTAAAA"), { valid: true });
  });

  it("빈 코드는 조회하지 않고 not_found 다", async () => {
    const invites = new FakeInviteStore(validSnapshot);
    const check = new CheckInviteCode(invites, countProbe(0), 10);

    assert.deepEqual(await check.execute("   "), { valid: false, reasonCode: "not_found" });
  });
});
