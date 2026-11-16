import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { RETENTION } from "../SyncMarketData";

/**
 * 시세 보관 정책 — 국내 5분봉은 400일(장중 기저율 base-rate@3 이력 · FC-REQ-028 FR-7), 코인 5분봉은 30일(이력은 예측 표가 따로).
 * 규칙은 순서대로 모두 돈다 — 앞 규칙이 국내 5분봉을 지우면 뒤 규칙의 400일이 의미 없다
 */
const days = (interval: string) => Number(interval.split(" ")[0]) * (interval.includes("year") ? 365 : 1);
const deletes = (assetType: string, timeframe: string, ageDays: number) =>
  RETENTION.some((r) => r.timeframe === timeframe && ("exceptAssetType" in r ? r.exceptAssetType !== assetType : true) && ageDays > days(r.interval));

describe("RETENTION — 보관 정책", () => {
  it("국내 5분봉은 1년 백필(365일)이 다 남고 400일 넘어야 지운다", () => {
    assert.equal(deletes("kr_stock", "5m", 365), false);
    assert.equal(deletes("kr_stock", "5m", 401), true);
  });
  it("코인 5분봉은 30일 · 국내 일봉은 지우지 않는다(5년 학습 창)", () => {
    assert.equal(deletes("crypto", "5m", 31), true);
    assert.equal(deletes("crypto", "5m", 29), false);
    assert.equal(deletes("kr_stock", "1d", 5 * 365), false);
  });
});
