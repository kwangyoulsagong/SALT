import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

/** 밴드 적립 계약이 BFF 와 프론트(`@repo/core/plan`)에서 같은지 본다 — 포지션 계약과 같은 방법(정의가 두 벌) */
const BLOCK = /\/\/ CONTRACT:BEGIN PlanView\n([\s\S]*?)\/\/ CONTRACT:END PlanView/;

const blockOf = (path: string): string => {
  const match = readFileSync(path, "utf8").match(BLOCK);
  assert.ok(match, `${path} 에 CONTRACT 블록이 없다`);
  return match[1];
};

describe("PlanView 계약", () => {
  it("BFF 뷰모델과 @repo/core 정의가 글자 그대로 같다", () => {
    const bff = blockOf(resolve(__dirname, "../plan.viewmodel.ts"));
    const core = blockOf(resolve(__dirname, "../../../../salt-microFe/packages/core/src/plan/plan.ts"));
    assert.equal(core, bff);
  });

  it("게이트 필드(renderable · blockedReason)가 계약에 있다", () => {
    const bff = blockOf(resolve(__dirname, "../plan.viewmodel.ts"));
    assert.match(bff, /renderable: boolean;/);
    assert.match(bff, /blockedReason: string \| null;/);
    assert.doesNotMatch(bff, /matched/);
  });
});
