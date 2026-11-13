import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { Prisma } from "@prisma/client";

import { grantedUserId, INVESTMENT_USER_ROWS } from "../../../composition.mydata";
import { checkUserRowSets, eraseUserRows, parseTableComment } from "../userRows";

/**
 * 내 데이터(서버 S3c, `SRV-REQ-048` FR-3 · 4) — Express 몫.
 * 불변식: **사람 칸(`user_id`)이 있는 Prisma 모델의 표는 전부 지우기 목록에 있다.** 새 모델을 만들고 목록에 안 적으면 여기서 깬다
 * (플랫폼은 `MyDataEndToEndTest` 가 스키마의 모든 표로 같은 것을 본다).
 */
describe("투자 쪽 내 데이터 목록", () => {
  it("user_id 열이 있는 모델의 표 = 목록의 표(빠짐 0 · 남는 것 0)", () => {
    const withUser = Prisma.dmmf.datamodel.models
      .filter((m) => m.fields.some((f) => (f.dbName ?? f.name) === "user_id"))
      .map((m) => m.dbName ?? m.name)
      .sort();
    assert.deepEqual([...INVESTMENT_USER_ROWS.map((s) => s.table)].sort(), withUser);
  });

  it("자식 먼저 — 코치 결과가 거래보다 앞 · 계획보다 앞", () => {
    const order = INVESTMENT_USER_ROWS.map((s) => s.table);
    assert.ok(order.indexOf("decision_outcomes") < order.indexOf("portfolio_transactions"));
    assert.ok(order.indexOf("decision_outcomes") < order.indexOf("trade_plans"));
  });

  it("목록 모양 검사 — 같은 표 두 번 · 자리표시 둘 · 이상한 이름은 거절", () => {
    assert.throws(() => checkUserRowSets([{ table: "a" }, { table: "a" }]));
    assert.throws(() => checkUserRowSets([{ table: "a", condition: "user_id = $1 OR x = $2" }]));
    assert.throws(() => checkUserRowSets([{ table: "a", condition: "1 = 1" }]));
    assert.throws(() => checkUserRowSets([{ table: "A; DROP" }]));
    assert.throws(() => checkUserRowSets([{ table: "a", nullify: "x y" }]));
  });

  it("지우기 — 목록 순서대로 · 비우기 표는 UPDATE · 사용자 id 는 자리표시로만", async () => {
    const sql: string[] = [];
    const db = {
      $executeRawUnsafe: async (q: string, ...args: unknown[]) => {
        assert.deepEqual(args, ["u1"]);
        sql.push(q);
        return 1;
      },
      $queryRawUnsafe: async () => [],
    } as never;
    const counts = await eraseUserRows(db, [{ table: "a" }, { table: "logs", nullify: "user_id" }], "u1");
    assert.deepEqual(sql, ["DELETE FROM a WHERE user_id = $1", "UPDATE logs SET user_id = NULL WHERE user_id = $1"]);
    assert.deepEqual(counts, { a: 1, logs: 1 });
  });

  it("지우기 허가 — 같은 사람 허가만 통과 · 없음 · 빈 값 · 다른 사람 · 무효는 ERASE_GRANT_REQUIRED", async () => {
    const verifier = { eraseGrant: async (t: string) => (t === "g-u1" ? { userId: "u1", email: "" } : t === "g-u2" ? { userId: "u2", email: "" } : null) };
    assert.equal(await grantedUserId(verifier, "g-u1", "u1"), "u1");
    for (const header of [undefined, "", ["g-u1"], "g-u2", "access-token"]) {
      await assert.rejects(grantedUserId(verifier, header, "u1"), (e: { code?: string }) => e.code === "ERASE_GRANT_REQUIRED");
    }
  });
});

/**
 * 개인 데이터 등급(서버 S3d, `SRV-REQ-048` FR-6) — 원천은 표 주석. Prisma 는 표 주석을 모르니 마이그레이션 SQL 을 읽는다(마지막 주석이 이긴다).
 * 불변식: **내보내는 사람 표마다 맞는 등급 주석이 있다.** 새 사람 표를 만들고 주석을 안 달면 여기서 깬다
 */
describe("투자 쪽 개인 데이터 등급", () => {
  const MIGRATIONS = join(__dirname, "../../../../prisma/migrations");
  const comments = (): Map<string, string> => {
    const seen = new Map<string, string>();
    for (const dir of readdirSync(MIGRATIONS).sort()) {
      if (dir.endsWith(".toml")) continue;
      const sql = readFileSync(join(MIGRATIONS, dir, "migration.sql"), "utf8");
      for (const m of sql.matchAll(/COMMENT ON TABLE\s+"?([a-z_]+)"?\s+IS\s+'((?:[^']|'')*)'/gi)) seen.set(m[1], m[2].replace(/''/g, "'"));
    }
    return seen;
  };

  it("내보내는 사람 표마다 등급 · 설명이 있다(아웃박스 · 운영 로그는 빼고)", () => {
    const all = comments();
    const missing = INVESTMENT_USER_ROWS.filter((s) => s.export !== false)
      .map((s) => s.table)
      .filter((t) => parseTableComment(all.get(t)).grade === null);
    assert.deepEqual(missing, []);
  });

  it("주석 읽기 경계 — 맞는 등급 + 설명만 통과", () => {
    const cases: Array<[string | null | undefined, ReturnType<typeof parseTableComment>]> = [
      ["financial: 적은 거래", { grade: "financial", about: "적은 거래" }],
      ["sensitive:감정", { grade: "sensitive", about: "감정" }],
      ["record: a: b", { grade: "record", about: "a: b" }],
      ["record:", { grade: null, about: null }],
      ["secret: 비밀", { grade: null, about: null }],
      ["Record: 대문자", { grade: null, about: null }],
      ["설명만", { grade: null, about: null }],
      ["", { grade: null, about: null }],
      [null, { grade: null, about: null }],
      [undefined, { grade: null, about: null }],
    ];
    for (const [input, want] of cases) assert.deepEqual(parseTableComment(input), want, String(input));
  });
});
