import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * **upsert 의 `create` 는 `where` 의 복합 유니크 칸을 모두 가진다.**
 *
 * 빠지면 `create` 가 그 칸의 기본값으로 저장된다 → `where` 로는 영영 못 찾고 늘 `create` → 두 번째부터 기본값끼리 유니크 위반.
 * 인사이트 셋이 그렇게 돌았다 — `dedupeKey: "whale:BTC"` 로 찾고 `"default"` 로 저장해 고래 신호 · 매수 구간이 첫 종목만 남고
 * 나머지는 회차마다 `P2002` 로 건너뛰었다(2026-11-02 로그 73번 · 2026-11-13 확인 중 발견). 셀 수 있으니 여기서 센다(`done-checklist` §1).
 *
 * 잡는 꼴: `prisma.<모델>.upsert({ where: { a_b_c: { a: …, b: …, c: … } }, create: { … } })` 에서 `create` 에 없는 칸
 */
const SRC = path.resolve(__dirname, "../../..");

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "__tests__" || name === "node_modules") return [];
    return statSync(full).isDirectory() ? files(full) : name.endsWith(".ts") ? [full] : [];
  });

/** `{` 부터 짝 `}` 까지 */
const block = (source: string, open: number): string => {
  let depth = 0;
  for (let i = open; i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    else if (source[i] === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
};

export const missingCreateKeys = (source: string): Array<{ line: number; missing: string[] }> => {
  const out: Array<{ line: number; missing: string[] }> = [];
  const re = /\.upsert\(\s*\{/g;
  for (let m = re.exec(source); m; m = re.exec(source)) {
    const args = block(source, source.indexOf("{", m.index));
    const where = /where:\s*\{\s*(\w+_\w+(?:_\w+)*):\s*\{/.exec(args);
    const createAt = /create:\s*\{/.exec(args);
    if (!where || !createAt) continue;
    const keys = block(args, where.index + where[0].length - 1);
    const fields = [...keys.matchAll(/(\w+)\s*[:,}]/g)].map((x) => x[1]!).filter((f) => where[1]!.split("_").includes(f));
    const create = block(args, createAt.index + createAt[0].length - 1);
    const missing = [...new Set(fields)].filter((f) => !new RegExp(`(^|[\\s{,])${f}\\s*[:,}]`).test(create) && !create.includes("..."));
    if (missing.length > 0) out.push({ line: source.slice(0, m.index).split("\n").length, missing });
  }
  return out;
};

describe("upsert create 는 where 의 유니크 칸을 모두 가진다", () => {
  it("검사기 자체 — 빠진 칸을 잡고 다 있으면 통과", () => {
    const bad = `prisma.x.upsert({ where: { userId_type_dedupeKey: { userId, type, dedupeKey: "a" } }, create: { userId, type }, update: {} })`;
    const good = `prisma.x.upsert({ where: { userId_type_dedupeKey: { userId, type, dedupeKey: "a" } }, create: { userId, type, dedupeKey: "a" }, update: {} })`;
    assert.deepEqual(missingCreateKeys(bad).map((x) => x.missing), [["dedupeKey"]]);
    assert.deepEqual(missingCreateKeys(good), []);
  });

  it("src 전체", () => {
    const found = files(SRC).flatMap((file) =>
      missingCreateKeys(readFileSync(file, "utf8")).map((x) => `${path.relative(SRC, file)}:${x.line} ${x.missing.join(", ")}`)
    );
    assert.deepEqual(found, []);
  });
});
