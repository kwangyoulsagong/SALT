import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

/**
 * 봉 저장(`price_history` upsert)은 **값이 바뀐 행만 쓴다** — 기계 검사(`DB-REQ-017` 2026-11-10).
 *
 * 수집 회차는 창 전체(5분봉 288개 · 일봉 120개)를 다시 받는다. `ON CONFLICT … DO UPDATE` 에 조건이 없으면 바뀌지 않은 행까지
 * 전부 새 버전으로 다시 쓴다 — 5분마다 300여 종목 × 400행이 문장 하나에 7~8초씩 DB 를 잡아 장중 판단 상세 · 시세가 16초까지 밀렸다.
 * 규칙: `ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE SET …` 뒤 같은 문장 안에 `WHERE` 가 있어야 한다.
 */
const SRC = join(__dirname, "../../..");

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === "__tests__" || name === "node_modules" ? [] : walk(path);
    return path.endsWith(".ts") ? [path] : [];
  });

describe("price_history upsert 는 바뀐 행만 쓴다", () => {
  const files = walk(SRC);
  const sites = files.flatMap((file) => {
    const text = readFileSync(file, "utf8");
    const found: Array<{ file: string; statement: string }> = [];
    let at = text.indexOf("ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE");
    while (at >= 0) {
      const end = text.indexOf("`", at);
      found.push({ file, statement: text.slice(at, end) });
      at = text.indexOf("ON CONFLICT (symbol, timeframe, timestamp) DO UPDATE", at + 1);
    }
    return found;
  });

  it("검사 대상이 있다(경로가 틀려 0 개로 통과하지 않게)", () => {
    assert.ok(sites.length >= 5, `찾은 자리 ${sites.length}`);
  });

  it("모든 자리에 조건(WHERE)이 있다", () => {
    const blind = sites.filter((site) => !/\bWHERE\b/.test(site.statement)).map((site) => site.file.replace(SRC, "src"));
    assert.deepEqual(blind, []);
  });
});
