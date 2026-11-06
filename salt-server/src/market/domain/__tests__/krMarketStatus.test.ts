import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  detectKrCircuitBreakers,
  isKrMarketActionActive,
  isKrViCodeActive,
  isKrViEventActive,
  krMarketActionResumesAt,
  krStatusBadges,
  krViKindOf,
  krVisibleLastTrade,
  KR_VI_MAX_ACTIVE_MS,
  type KrIntradayPoint,
} from "../index";

/** KST `HH:MM` (2026-11-06) → UTC Date */
const kst = (hhmm: string, date = "2026-11-06") => new Date(`${date}T${hhmm}:00+09:00`);
/** DB 분 기록 표본(UTC 벽시계 `HH:MM` → KST 09:00 + 분) */
const fromUtc = (rows: Array<[string, number]>): KrIntradayPoint[] =>
  rows.map(([hhmm, value]) => ({ at: new Date(`2026-11-06T${hhmm}:00Z`), value }));

/**
 * 2026-11-06 실제 분 기록(로컬 DB `kr_index_ticks`, UTC 00:00 = KST 09:00). 코스피는 09:03 -8.77% 뒤 09:04~09:32 4923.47 에 멈췄다가
 * 09:34 재개(20분 정지 + 10분 단일가). 수집이 비운 분(09:16 · 09:18~20 …)이 섞여 있다. 코스닥은 -7% 까지 갔지만 멈추지 않았다
 */
const KOSPI_2026_11_06 = fromUtc([
  ["00:00", 5383.8], ["00:01", 5268.85], ["00:02", 5263.7], ["00:03", 4911.91], ["00:04", 4923.47], ["00:05", 4923.47],
  ["00:06", 4923.47], ["00:07", 4923.47], ["00:08", 4923.47], ["00:09", 4923.47], ["00:10", 4923.47], ["00:11", 4923.47],
  ["00:12", 4923.47], ["00:13", 4923.47], ["00:14", 4923.47], ["00:15", 4923.47], ["00:17", 4923.47], ["00:21", 4923.47],
  ["00:22", 4923.47], ["00:24", 4923.47], ["00:27", 4923.47], ["00:30", 4923.47], ["00:31", 4923.47], ["00:32", 4923.47],
  ["00:34", 5022.12], ["00:35", 5090.68], ["00:36", 5094.19], ["00:37", 5085.47], ["00:38", 5088.97], ["00:39", 5087.01],
]);
const KOSPI_PREV_CLOSE = 5383.8; // 4987.00 − (−396.80)
const KOSDAQ_2026_11_06 = fromUtc([
  ["00:00", 678.41], ["00:01", 651.07], ["00:02", 651.04], ["00:03", 631.76], ["00:04", 631.15], ["00:05", 632.38],
  ["00:06", 629.17], ["00:07", 631.84], ["00:08", 632.37], ["00:09", 635.42], ["00:10", 635.39],
]);

describe("서킷브레이커 추정 — 지수 분 기록 재생(F016 단계 A · SRV-REQ-051 FR-3)", () => {
  it("2026-11-06 코스피: 1단계 09:04 시작 · 09:34 끝 · 재개 예정 09:24", () => {
    const [cb, ...rest] = detectKrCircuitBreakers("KOSPI", KOSPI_2026_11_06, KOSPI_PREV_CLOSE);
    assert.equal(rest.length, 0);
    assert.deepEqual(
      { kind: cb.kind, stage: cb.stage, direction: cb.direction, source: cb.source, tradeDate: cb.tradeDate },
      { kind: "circuit_breaker", stage: 1, direction: "down", source: "inferred", tradeDate: "2026-11-06" }
    );
    assert.equal(cb.startedAt.getTime(), kst("09:04").getTime());
    assert.equal(cb.endedAt?.getTime(), kst("09:34").getTime());
    assert.equal(krMarketActionResumesAt(cb)?.getTime(), kst("09:24").getTime());
  });

  it("멈춘 동안(09:20)엔 끝이 없다 — 같은 입력의 앞부분만 보면 진행 중", () => {
    const sofar = KOSPI_2026_11_06.filter((p) => p.at.getTime() <= kst("09:20").getTime());
    const [cb] = detectKrCircuitBreakers("KOSPI", sofar, KOSPI_PREV_CLOSE);
    assert.equal(cb.endedAt, null);
    assert.equal(isKrMarketActionActive(cb, kst("09:20"), true), true);
    // 장이 닫히면 끝을 못 봤어도 내린다 · 다음 날엔 남지 않는다
    assert.equal(isKrMarketActionActive(cb, kst("15:40"), false), false);
    assert.equal(isKrMarketActionActive(cb, kst("09:20", "2026-11-09"), true), false);
  });

  it("코스닥은 -7% 까지 갔어도 멈추지 않았다 → 0건", () => {
    assert.deepEqual(detectKrCircuitBreakers("KOSDAQ", KOSDAQ_2026_11_06, 678.41), []);
  });

  // 허용 · 거절 경계 — 문턱 · 지속 · 시각 · 단계 순서
  const flat = (from: string, to: string, value: number) => {
    const points: KrIntradayPoint[] = [];
    for (let t = kst(from).getTime(); t <= kst(to).getTime(); t += 60_000) points.push({ at: new Date(t), value });
    return points;
  };
  const cases: Array<{ name: string; points: KrIntradayPoint[]; stages: number[] }> = [
    { name: "-8.00% 정확히 1분 → 1단계", points: flat("10:00", "10:01", 92), stages: [1] },
    { name: "-7.99% 는 문턱 밖", points: flat("10:00", "10:05", 92.01), stages: [] },
    { name: "-8% 라도 한 점(지속 0초)은 아님", points: flat("10:00", "10:00", 90), stages: [] },
    { name: "-15% → 2단계(1단계를 건너뛴 날)", points: flat("10:00", "10:02", 85), stages: [2] },
    { name: "-20% → 3단계 · 끝 없음", points: [...flat("10:00", "10:02", 80), { at: kst("10:03"), value: 79 }], stages: [3] },
    { name: "14:50 뒤 1단계는 발동 없음(종가 단일가 멈춤을 읽지 않는다)", points: flat("15:20", "15:30", 90), stages: [] },
    { name: "14:50 뒤라도 3단계는 남는다", points: flat("15:00", "15:02", 79), stages: [3] },
    { name: "오른 날 멈춤은 아님", points: flat("10:00", "10:05", 109), stages: [] },
    {
      name: "1단계 두 번째 멈춤은 세지 않고 · 더 깊으면 2단계",
      points: [...flat("09:30", "09:31", 91), { at: kst("09:50"), value: 93 }, ...flat("10:00", "10:01", 91.5), ...flat("11:00", "11:01", 84)],
      stages: [1, 2],
    },
  ];
  for (const c of cases) {
    it(c.name, () => {
      const found = detectKrCircuitBreakers("KOSPI", c.points, 100);
      assert.deepEqual(found.map((f) => f.stage), c.stages);
      if (c.stages.includes(3)) assert.equal(found.find((f) => f.stage === 3)?.endedAt, null);
    });
  }

  it("전일 종가가 없거나 0 이면 판단하지 않는다", () => {
    assert.deepEqual(detectKrCircuitBreakers("KOSPI", KOSPI_2026_11_06, 0), []);
  });
});

describe("VI · 상태 칩 · 마지막 체결 — 허용 · 거절 경계", () => {
  const base = {
    statusCode: "55", warnCode: "00", isHalted: false, viCode: "N",
    cautionFlag: false, managedFlag: false, liquidationFlag: false, shortOverheatFlag: false,
  };

  it("현재가 상태 칸 vi_cls_code — N · 빈 값 · 0 · null 은 아님, 그 밖은 발동 중", () => {
    for (const code of ["N", "", "0", null, undefined]) assert.equal(isKrViCodeActive(code), false, String(code));
    for (const code of ["Y", "1", "2", "3"]) assert.equal(isKrViCodeActive(code), true, code);
  });

  it("VI 종류 코드 1 · 2 · 3 만 안다", () => {
    assert.deepEqual(["1", "2", "3", "0", null].map(krViKindOf), ["static", "dynamic", "both", null, null]);
  });

  it("VI 사건 — 해제 전 · 5분 안만 발동 중", () => {
    const at = kst("10:00");
    assert.equal(isKrViEventActive({ triggeredAt: at, releasedAt: null }, kst("10:01")), true);
    assert.equal(isKrViEventActive({ triggeredAt: at, releasedAt: kst("10:02") }, kst("10:01")), true);
    assert.equal(isKrViEventActive({ triggeredAt: at, releasedAt: kst("10:02") }, kst("10:03")), false);
    assert.equal(isKrViEventActive({ triggeredAt: at, releasedAt: null }, new Date(at.getTime() + KR_VI_MAX_ACTIVE_MS + 1)), false);
  });

  it("칩 표 — 플래그 하나에 칩 하나", () => {
    const table: Array<[Partial<typeof base>, string[], boolean?]> = [
      [{ viCode: "Y" }, ["vi"]],
      [{}, ["vi"], true],
      [{ cautionFlag: true }, ["attention"]],
      [{ managedFlag: true }, ["administrative"]],
      [{ liquidationFlag: true }, ["liquidation"]],
      [{ shortOverheatFlag: true }, ["overheat"]],
      [{ statusCode: "59", shortOverheatFlag: true }, ["overheat"]],
      [{ isHalted: true }, ["paused"]],
      [{ isHalted: true, statusCode: "58" }, ["halted"]],
    ];
    for (const [over, expected, viActive] of table) {
      assert.deepEqual(krStatusBadges({ ...base, ...over }, viActive).sort(), expected, JSON.stringify(over));
    }
  });

  it("마지막 체결은 값이 멈춘 이유가 있을 때만", () => {
    const at = kst("09:03");
    assert.equal(krVisibleLastTrade(at, [], false), null);
    assert.equal(krVisibleLastTrade(at, ["caution"], false), null);
    for (const b of ["halted", "paused", "vi"] as const) assert.equal(krVisibleLastTrade(at, [b], false), at);
    assert.equal(krVisibleLastTrade(at, [], true), at);
    assert.equal(krVisibleLastTrade(null, ["halted"], true), null);
  });
});
