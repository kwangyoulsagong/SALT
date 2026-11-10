import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

/**
 * **행마다 쓰기를 `Promise.all` 로 흩지 않는다**(`prisma-database.md` — 한 문장 `UPDATE … FROM` · `INSERT … ON CONFLICT`).
 *
 * 같은 사고가 세 번 났다 — 관심 시세 갱신(2026-11-02 위험 예산 조회 타임아웃) · 시장 시세 300종목 · 캔들 upsert(2026-11-10 장중
 * `/api/ai-coach` 504). 묶음 하나가 연결 풀(17)을 통째로 잡고 그동안 API 요청이 줄을 선다. 규칙 문서에 적기만 한 것은 다시
 * 들어왔다 — 여기서 센다(`done-checklist` §1).
 *
 * 잡는 꼴: `Promise.all(` 뒤 같은 식 안에 `.map(` 과 `prisma.<모델>.<쓰기>(` 가 함께 있는 것. 쓰기를 저장소 메서드로 감싸
 * 부르는 간접 꼴은 못 잡는다 — 그건 저장소가 한 문장으로 쓰게 한다
 */
const SRC = path.resolve(__dirname, "../../..");
const WRITE = /prisma\.\w+\.(update|updateMany|upsert|create|createMany|delete|deleteMany)\(/;

const files = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const full = path.join(dir, name);
    if (name === "__tests__" || name === "node_modules") return [];
    return statSync(full).isDirectory() ? files(full) : name.endsWith(".ts") ? [full] : [];
  });

/** `Promise.all(` 의 괄호 짝까지 — 그 식 하나만 본다 */
const callBodies = (source: string): string[] => {
  const bodies: string[] = [];
  let at = source.indexOf("Promise.all(");
  while (at !== -1) {
    let depth = 0;
    let end = at + "Promise.all".length;
    for (; end < source.length; end += 1) {
      if (source[end] === "(") depth += 1;
      else if (source[end] === ")" && --depth === 0) break;
    }
    bodies.push(source.slice(at, end + 1));
    at = source.indexOf("Promise.all(", end);
  }
  return bodies;
};

export const parallelRowWrites = (source: string): string[] =>
  callBodies(source).filter((body) => body.includes(".map(") && WRITE.test(body));

describe("행마다 쓰기를 Promise.all 로 흩지 않는다", () => {
  it("판정 — 허용 · 거절", () => {
    const rejected = [
      "await Promise.all(quotes.map((q) => prisma.marketAsset.updateMany({ where: { symbol: q.symbol } })));",
      "await Promise.all(\n  chunk.map((c) =>\n    prisma.priceHistory.upsert({ where: {} })\n  )\n);",
    ];
    const allowed = [
      "const [a, b] = await Promise.all([prisma.user.findMany(), prisma.user.count()]);",
      "await Promise.all(batch.map((s) => this.refreshSymbol(s)));",
      "await Promise.all([prisma.a.update({}), prisma.b.update({})]);",
    ];
    for (const s of rejected) assert.equal(parallelRowWrites(s).length, 1, s);
    for (const s of allowed) assert.equal(parallelRowWrites(s).length, 0, s);
  });

  it("src 전체 — 0곳", () => {
    const found = files(SRC).flatMap((file) =>
      parallelRowWrites(readFileSync(file, "utf8")).map((body) => `${path.relative(SRC, file)}: ${body.slice(0, 80)}`)
    );
    assert.deepEqual(found, []);
  });
});
