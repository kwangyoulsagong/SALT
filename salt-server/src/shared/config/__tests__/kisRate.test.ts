import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { kisDefaultRequestsPerSecond } from "../env";

/** KIS 출발 상한 기본값(`SRV-REQ-057` FR-3) — 모의 서버는 약 2건/s 에서 막혀 3 이면 초과가 쌓였다(11-10 80분 1,087건) */
describe("KIS 출발 상한 기본값", () => {
  it("모의 주소면 1, 실 주소면 3", () => {
    assert.equal(kisDefaultRequestsPerSecond("https://openapivts.koreainvestment.com:29443"), 1);
    assert.equal(kisDefaultRequestsPerSecond("https://openapi.koreainvestment.com:9443"), 3);
  });
});
