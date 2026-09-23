import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoachProfile, CoachProfileStore } from "../../domain";
import { GetCoachProfile, UpdateCoachProfile } from "../ManageCoachProfile";

/**
 * 코치 설정 영속화 (`SRV-REQ-025` FR-13 · `DB-REQ-017` FR-20~22).
 *
 * 가짜 저장소는 받은 패치를 **정말로 쌓는다** — "응답에만 싣고 저장하지 않는" 옛 동작을
 * 다시 들이면 두 번째 조회에서 드러나게.
 */

class MemoryProfiles implements CoachProfileStore {
  row: CoachProfile | null = null;

  async findByUser() {
    return this.row;
  }

  async upsert(userId: string, patch: Partial<Omit<CoachProfile, "userId">>) {
    const defined = Object.fromEntries(
      Object.entries(patch).filter(([, value]) => value !== undefined)
    );
    this.row = {
      userId,
      riskTolerance: "medium",
      maxSingleAssetWeight: 0.6,
      rebalanceBand: 0.1,
      panicSellWindowHours: 24,
      defaultMode: null,
      notificationLevel: null,
      ...this.row,
      ...defined,
    };
    return this.row;
  }
}

describe("ManageCoachProfile", () => {
  it("고른 적이 없으면 응답은 기본값이고 저장은 null 이다", async () => {
    const store = new MemoryProfiles();
    const view = await new GetCoachProfile(store).execute("u1");

    assert.equal(view.defaultMode, "scalp");
    assert.equal(view.notificationLevel, "medium");
    assert.equal(store.row?.defaultMode, null);
  });

  it("고른 값이 저장되고 다음 조회에 남는다 — unsupportedPersistedFields 가 없다", async () => {
    const store = new MemoryProfiles();
    const updated = await new UpdateCoachProfile(store).execute("u1", {
      defaultMode: "long_term",
      notificationLevel: "low",
    });
    const read = await new GetCoachProfile(store).execute("u1");

    assert.equal(updated.defaultMode, "long_term");
    assert.equal(read.defaultMode, "long_term");
    assert.equal(read.notificationLevel, "low");
    assert.equal("unsupportedPersistedFields" in updated, false);
  });

  it("한 필드만 바꾸면 다른 필드는 그대로다", async () => {
    const store = new MemoryProfiles();
    const update = new UpdateCoachProfile(store);
    await update.execute("u1", { defaultMode: "long_term" });
    const view = await update.execute("u1", { notificationLevel: "high" });

    assert.equal(view.defaultMode, "long_term");
    assert.equal(view.notificationLevel, "high");
  });
});
