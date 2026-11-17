import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { causeCaptureDate, causeFingerprint, toCauseSnapshot, type CauseSnapshotCandidate } from "../policy/causeSnapshot";

/**
 * 원인 스냅샷 찍는 창(F017 v4 5a 불변식 1) — 거래일이 끝난 뒤(국내) · 끝나기 직전(코인)만. 창 밖은 null(빈 날 — 다른 시각 값으로 메우지 않는다)
 */
const kst = (s: string) => new Date(`${s}+09:00`);

describe("causeCaptureDate — 찍는 창 경계", () => {
  const table: Array<[string, "kr" | "crypto", string | null]> = [
    ["2026-11-16T15:39:59", "kr", null], // 마감 10분 전 — 아직 아님
    ["2026-11-16T15:40:00", "kr", "2026-11-16"],
    ["2026-11-16T23:59:00", "kr", "2026-11-16"],
    ["2026-11-17T00:00:00", "kr", null], // 다음 날 새벽 — 그 KST 날짜는 아직 장 전
    ["2026-11-17T08:40:00", "kr", null], // 장 전엔 어제 등락이 '오늘'로 보인다 — 찍지 않는다
    ["2026-11-16T12:30:00", "kr", null], // 장중 반나절
    ["2026-11-17T07:59:59", "crypto", null],
    ["2026-11-17T08:00:00", "crypto", "2026-11-16"], // 11-16 09:00 에 시작한 하루의 끝 직전
    ["2026-11-17T08:59:59", "crypto", "2026-11-16"],
    ["2026-11-17T09:00:00", "crypto", null], // 새 하루 시작 — 몇 분짜리 등락
    ["2026-11-17T16:40:00", "crypto", null],
    ["2026-11-01T08:30:00", "crypto", "2026-10-31"], // 달 경계
  ];
  for (const [at, market, want] of table) {
    it(`${market} ${at} KST → ${want ?? "찍지 않음"}`, () => assert.equal(causeCaptureDate(market, kst(at)), want));
  }
});

const cand = (over: Partial<CauseSnapshotCandidate> = {}): CauseSnapshotCandidate => ({
  kind: "sector",
  strength: "likely",
  headline: "은행 업종 전체 상승",
  factId: null,
  at: null,
  evidence: [{ kind: "sector_index", value: "업종 +2.81%", compare: "15종목 중 12종목", source: "업종", at: null, supports: true }],
  ...over,
});

describe("causeFingerprint — 같은 원인 = 같은 지문", () => {
  it("같은 목록 · 같은 등락이면 같다(재실행이 행을 늘리지 않는다)", () => {
    assert.equal(causeFingerprint(3.1, [cand()]), causeFingerprint(3.1, [cand()]));
  });
  it("표시 시각(at)만 바뀌면 같다", () => {
    assert.equal(causeFingerprint(3.1, [cand({ at: "2026-11-16T06:30:00Z" })]), causeFingerprint(3.1, [cand({ at: "2026-11-16T07:30:00Z" })]));
  });
  it("단계 · 종류 · 근거 숫자 · 등락이 바뀌면 다르다", () => {
    const base = causeFingerprint(3.1, [cand()]);
    assert.notEqual(causeFingerprint(3.1, [cand({ strength: "possible" })]), base);
    assert.notEqual(causeFingerprint(3.1, [cand({ kind: "market" })]), base);
    assert.notEqual(causeFingerprint(3.1, [cand({ evidence: [{ ...cand().evidence[0]!, value: "업종 +2.90%" }] })]), base);
    assert.notEqual(causeFingerprint(3.2, [cand()]), base);
  });
});

describe("toCauseSnapshot", () => {
  it("맨 앞 원인이 top · 화면 문구(note · gloss)는 저장하지 않는다", () => {
    const row = toCauseSnapshot("kr", "055550", "2026-11-16", kst("2026-11-16T16:40:00"), {
      split: { market: 0.4, sector: 2.1, idio: 0.6, method: "regression" },
      causes: [{ ...cand(), note: "업종이 같이 움직였어요", evidence: [{ ...cand().evidence[0]!, gloss: "풀이" }] }, cand({ kind: "flow", strength: "possible" })],
      changeRate: 3.1,
    });
    assert.ok(row);
    assert.equal(row.topKind, "sector");
    assert.equal(row.topStrength, "likely");
    assert.equal(row.candidates.length, 2);
    assert.equal("note" in row.candidates[0]!, false);
    assert.equal("gloss" in row.candidates[0]!.evidence[0]!, false);
  });
  it("원인 목록이 비면 찍지 않는다", () => {
    assert.equal(toCauseSnapshot("kr", "055550", "2026-11-16", new Date(), { split: null, causes: [], changeRate: 0 }), null);
  });
});
