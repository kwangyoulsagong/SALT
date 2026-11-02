import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

/**
 * 홈 카드 계약이 BFF 와 프론트(`@repo/core`)에서 같은지 본다 (`BFF-REQ-046` 수용 기준 "프론트 타입과 같은 정의").
 *
 * `bff` 는 pnpm workspace 밖이라 `@repo/core` 를 import 하지 못한다 — 정의가 두 벌이다. 한쪽만 고치면
 * 다른 쪽이 조용히 깨지므로 `CONTRACT` 블록을 글자 그대로 대조한다.
 */
const BLOCK = /\/\/ CONTRACT:BEGIN HomeSummaryCard\n([\s\S]*?)\/\/ CONTRACT:END HomeSummaryCard/;

const blockOf = (path: string): string => {
  const match = readFileSync(path, "utf8").match(BLOCK);
  assert.ok(match, `${path} 에 CONTRACT 블록이 없다`);
  return match[1];
};

describe("HomeSummaryCard 계약", () => {
  it("BFF 뷰모델과 @repo/core 정의가 글자 그대로 같다", () => {
    const bff = blockOf(resolve(__dirname, "../home-card.viewmodel.ts"));
    const core = blockOf(resolve(__dirname, "../../../../salt-microFe/packages/core/src/home/homeSummaryCard.ts"));
    assert.equal(core, bff);
  });
});
