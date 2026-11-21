import { describe, expect, it } from "vitest";

import {
  OFFLINE_ROWS_MAX,
  isOfflineRecord,
  offlineRecordFor,
  offlineScreenOf,
  offlineStampText,
  trimOfflineSnapshot,
  type OfflineRecord,
} from "./offline";

const record = (over: Partial<OfflineRecord> = {}): OfflineRecord => ({
  screen: "home",
  userId: "u-1",
  fetchedAt: Date.UTC(2026, 10, 21, 5, 5),
  snapshot: { screen: "home", title: "홈", sections: [{ title: "요약", rows: [{ label: "저축", value: "120만 원" }] }] },
  ...over,
});

describe("offlineRecordFor — 그 사용자의 한 벌만", () => {
  it.each([
    ["같은 사용자 · 같은 화면", "u-1", "home", true],
    ["다른 사용자", "u-2", "home", false],
    ["지금 사용자 없음(로그아웃 · 세션 죽음)", null, "home", false],
    ["빈 사용자 id", "", "home", false],
    ["다른 화면 키", "u-1", "goals", false],
  ] as const)("%s", (_, userId, screen, shown) => {
    expect(offlineRecordFor(record(), userId, screen) !== null).toBe(shown);
  });

  it("깨진 행 · 옛 판은 없는 것으로", () => {
    expect(offlineRecordFor({ ...record(), fetchedAt: "어제" }, "u-1", "home")).toBeNull();
    expect(offlineRecordFor({ ...record(), snapshot: { ...record().snapshot, screen: "goals" } }, "u-1", "home")).toBeNull();
    expect(offlineRecordFor(null, "u-1", "home")).toBeNull();
  });
});

describe("isOfflineRecord", () => {
  it.each([
    ["정상", record(), true],
    ["모르는 화면", { ...record(), screen: "investments" }, false],
    ["사용자 id 빔", { ...record(), userId: "" }, false],
    ["시각 NaN", { ...record(), fetchedAt: Number.NaN }, false],
    ["행 값이 숫자", record({ snapshot: { screen: "home", title: "홈", sections: [{ title: "a", rows: [{ label: "x", value: 1 as unknown as string }] }] } }), false],
    ["보조 줄 있음", record({ snapshot: { screen: "home", title: "홈", sections: [{ title: "a", rows: [{ label: "x", value: "1", sub: "s" }] }] } }), true],
  ])("%s", (_, value, ok) => {
    expect(isOfflineRecord(value)).toBe(ok);
  });
});

describe("offlineScreenOf", () => {
  it.each([
    ["/m/home", "home"],
    ["/m/home/", "home"],
    ["/m/goals?x=1", "goals"],
    ["/m/household", "household"],
    ["/m/goals/abc", null],
    ["/m/investments", null],
    ["/home", null],
  ])("%s → %s", (path, screen) => {
    expect(offlineScreenOf(path)).toBe(screen);
  });
});

describe("trimOfflineSnapshot", () => {
  it("구역 행을 상한으로 자르고 빈 구역을 뺀다", () => {
    const rows = Array.from({ length: OFFLINE_ROWS_MAX + 5 }, (_, i) => ({ label: `행 ${i}`, value: `${i}` }));
    const trimmed = trimOfflineSnapshot({ screen: "household", title: "가계부", sections: [{ title: "긴", rows }, { title: "빈", rows: [] }] });
    expect(trimmed.sections).toHaveLength(1);
    expect(trimmed.sections[0]!.rows).toHaveLength(OFFLINE_ROWS_MAX);
  });
});

describe("offlineStampText — 서울 시각", () => {
  const at = Date.UTC(2026, 10, 21, 5, 5); // 서울 14:05
  it("같은 날이면 시:분만", () => {
    expect(offlineStampText(at, Date.UTC(2026, 10, 21, 14, 0))).toBe("14:05");
  });
  it("서울 날짜가 바뀌면 날짜를 붙인다(UTC 로는 같은 날)", () => {
    expect(offlineStampText(at, Date.UTC(2026, 10, 21, 15, 30))).toBe("11. 21. 14:05");
  });
});
