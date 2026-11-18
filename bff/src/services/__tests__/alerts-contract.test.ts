import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

/** 알림 계약이 BFF 와 프론트(`@repo/core/alerts`)에서 같은지 본다 — 홈 카드 계약과 같은 방법(정의가 두 벌) */
const BLOCK = /\/\/ CONTRACT:BEGIN AlertsView\n([\s\S]*?)\/\/ CONTRACT:END AlertsView/;

const blockOf = (path: string): string => {
  const match = readFileSync(path, "utf8").match(BLOCK);
  assert.ok(match, `${path} 에 CONTRACT 블록이 없다`);
  return match[1];
};

describe("AlertsView 계약", () => {
  it("BFF 뷰모델과 @repo/core 정의가 글자 그대로 같다", () => {
    const bff = blockOf(resolve(__dirname, "../alerts.viewmodel.ts"));
    const core = blockOf(resolve(__dirname, "../../../../salt-microFe/packages/core/src/notification/alerts.ts"));
    assert.equal(core, bff);
  });
});
