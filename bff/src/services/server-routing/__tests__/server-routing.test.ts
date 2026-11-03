import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, it } from "node:test";

import { compareGolden, goldenFileName, readGoldens, recordGolden } from "../golden";
import { firstDifference, normalize } from "../normalize";
import { parseRoutingTable, resolveMode, RoutingTableFile } from "../routing-table";
import { compareResponses, isShadowable, ShadowGate, ShadowLog, summarize } from "../shadow";
import { outgoingTraceparent, runInTrace, traceIdFrom } from "../trace";

/** 스트랭글러 장치 — 라우팅 스위치 · 그림자 · 골든 · 추적 ID (`BFF-REQ-045`) */

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "bff-routing-"));

describe("라우팅 표 (FR-1)", () => {
  const table = parseRoutingTable(JSON.stringify({ default: "legacy", routes: { "/platform": "platform", "/goals": "shadow", "/goals/internal": "legacy" } }));

  it("가장 긴 prefix 가 이기고, 조각 경계에서만 맞는다", () => {
    assert.equal(resolveMode(table, "/platform/ping"), "platform");
    assert.equal(resolveMode(table, "/goals?x=1"), "shadow");
    assert.equal(resolveMode(table, "/goals/internal/sync"), "legacy");
    assert.equal(resolveMode(table, "/goalsX"), "legacy");
    assert.equal(resolveMode(table, "/investment/market"), "legacy");
  });

  it("틀린 값은 읽지 않는다", () => {
    assert.throws(() => parseRoutingTable(JSON.stringify({ routes: { "/a": "kotlin" } })));
    assert.throws(() => parseRoutingTable(JSON.stringify({ routes: { a: "legacy" } })));
  });

  it("값 하나를 바꾸면 재시작 없이 반영되고, 깨진 파일이면 직전 표를 쓴다", () => {
    const dir = tmp();
    const file = path.join(dir, "routes.json");
    let now = 0;
    fs.writeFileSync(file, JSON.stringify({ default: "legacy", routes: { "/goals": "legacy" } }));
    const routes = new RoutingTableFile(file, () => now, 1_000);
    assert.equal(routes.modeFor("/goals"), "legacy");

    fs.writeFileSync(file, JSON.stringify({ default: "legacy", routes: { "/goals": "platform" } }));
    fs.utimesSync(file, new Date(), new Date(Date.now() + 5_000));
    now = 500;
    assert.equal(routes.modeFor("/goals"), "legacy", "1초 안에는 다시 읽지 않는다");
    now = 1_500;
    assert.equal(routes.modeFor("/goals"), "platform", "되돌리기 = 값 하나");

    fs.writeFileSync(file, "{ 깨짐");
    fs.utimesSync(file, new Date(), new Date(Date.now() + 10_000));
    now = 3_000;
    assert.equal(routes.modeFor("/goals"), "platform", "깨진 파일은 직전 표 유지");
  });

  it("처음부터 없으면 전부 legacy · 읽은 뒤 잠깐 사라지면 직전 표 유지", () => {
    assert.equal(new RoutingTableFile(path.join(tmp(), "none.json")).modeFor("/platform/ping"), "legacy");
    const file = path.join(tmp(), "routes.json");
    let now = 0;
    fs.writeFileSync(file, JSON.stringify({ routes: { "/platform": "platform" } }));
    const routes = new RoutingTableFile(file, () => now, 1_000);
    fs.rmSync(file); // 편집기의 이름 바꾸기 저장 틈
    now = 2_000;
    assert.equal(routes.modeFor("/platform/ping"), "platform");
  });

  it("저장소의 표가 읽힌다(src 밖 — dist 실행 · 이미지와 같은 자리)", () => {
    const routes = new RoutingTableFile(path.resolve("config/server-routes.json"));
    assert.equal(routes.modeFor("/platform/ping"), "platform");
    assert.equal(routes.modeFor("/goals"), "legacy");
  });
});

describe("그림자 (FR-3 · 4)", () => {
  it("쓰기 요청은 그림자로 보내지 않는다 — 읽기만", () => {
    assert.equal(isShadowable("get", undefined), true);
    assert.equal(isShadowable("HEAD", undefined), true);
    for (const method of ["post", "put", "patch", "delete"]) assert.equal(isShadowable(method, undefined), false, method);
    assert.equal(isShadowable("get", "stream"), false, "SSE 는 비교하지 않는다");
  });

  it("변동 필드는 무시하고, 숫자 차이는 잡는다 — 첫 차이는 경로만", () => {
    const legacy = { status: 200, data: { data: { id: "c" + "a".repeat(24), at: "2026-11-03T01:02:03.456Z", total: 1000.5 } } };
    const same = { status: 200, data: { data: { total: 1000.5, at: "2026-11-03T09:09:09Z", id: "c" + "b".repeat(24) } } };
    const differs = { status: 200, data: { data: { id: "c" + "b".repeat(24), at: "2026-11-03T09:09:09Z", total: 1000.4 } } };
    assert.deepEqual(compareResponses(legacy, same), { match: true, firstDiff: null });
    assert.deepEqual(compareResponses(legacy, differs), { match: false, firstDiff: "$.data.total" });
    assert.deepEqual(compareResponses(legacy, { status: 500, data: {} }), { match: false, firstDiff: "$status" });
  });

  it("그림자 동시 상한 · 표본 비율 — 넘치면 건너뛰고 센다", () => {
    const gate = new ShadowGate(2, 1);
    assert.equal(gate.tryEnter(), true);
    assert.equal(gate.tryEnter(), true);
    assert.equal(gate.tryEnter(), false);
    gate.leave();
    assert.equal(gate.tryEnter(), true);
    assert.equal(gate.skipped, 1);
    const sampled = new ShadowGate(10, 0.25, () => 0.5);
    assert.equal(sampled.tryEnter(), false);
  });

  it("기록은 비동기로 순서대로 이어 쓴다", async () => {
    const dir = tmp();
    const log = new ShadowLog(dir);
    const base = { method: "GET", legacyStatus: 200, platformStatus: 200, match: true, firstDiff: null, platformMs: 1 };
    await Promise.all([1, 2, 3].map((i) => log.append({ ...base, at: "2026-11-03T00:00:00Z", path: `/p${i}` })));
    const lines = fs.readFileSync(path.join(dir, "shadow-2026-11-03.jsonl"), "utf8").trim().split("\n").map((l) => JSON.parse(l).path);
    assert.deepEqual(lines, ["/p1", "/p2", "/p3"]);
  });

  it("경로별 일치율 — ID 조각은 묶는다", () => {
    const base = { at: "2026-11-03T00:00:00Z", method: "GET", legacyStatus: 200, platformStatus: 200, platformMs: 3 };
    const rows = summarize([
      { ...base, path: "/goals/c" + "a".repeat(24), match: true, firstDiff: null },
      { ...base, path: "/goals/c" + "b".repeat(24), match: false, firstDiff: "$.data.name" },
      { ...base, path: "/goals", match: true, firstDiff: null },
    ]);
    assert.equal(rows[0].path, "/goals/:id");
    assert.equal(rows[0].matchRate, 0.5);
    assert.deepEqual(rows[0].firstDiffs, { "$.data.name": 1 });
  });
});

describe("골든 JSON (FR-2)", () => {
  it("녹화 → 재생 비교 — 정규화된 본문으로", () => {
    const dir = tmp();
    recordGolden(dir, "get", "/goals?status=active", 200, { success: true, data: [{ id: "c" + "a".repeat(24), createdAt: "2026-11-01T00:00:00.000Z", saved: 5000 }] });
    const [golden] = readGoldens(dir);
    assert.equal(golden.method, "GET");
    assert.equal(golden.url, "/goals?status=active");
    assert.equal(compareGolden(golden, 200, { success: true, data: [{ id: "c" + "z".repeat(24), createdAt: "2026-11-03T00:00:00Z", saved: 5000 }] }), null);
    assert.equal(compareGolden(golden, 200, { success: true, data: [{ id: "c" + "z".repeat(24), createdAt: "2026-11-03T00:00:00Z", saved: 5001 }] }), "$.data[0].saved");
    assert.equal(compareGolden(golden, 404, {}), "$status");
  });

  it("토큰을 녹화하지 않는다 — 인증 경로는 통째로, 다른 경로는 비밀 키 값만 가린다", () => {
    const dir = tmp();
    assert.equal(recordGolden(dir, "post", "/auth/login", 200, { data: { accessToken: "eyJ.a.b", refreshToken: "eyJ.c.d" } }), null);
    assert.equal(recordGolden(dir, "post", "/auth?x=1", 200, {}), null);
    recordGolden(dir, "get", "/users/profile", 200, { data: { name: "n", apiToken: "s3cr3t", password: null } });
    const raw = fs.readdirSync(dir).map((f) => fs.readFileSync(path.join(dir, f), "utf8")).join("");
    assert.equal(raw.includes("eyJ"), false);
    assert.equal(raw.includes("s3cr3t"), false);
    assert.equal(readGoldens(dir).length, 1);
  });

  it("파일 이름 — 긴 주소도 .json 으로 끝나고, 비슷한 주소가 겹치지 않는다", () => {
    const long = goldenFileName("get", `/x?symbols=${"A,".repeat(300)}`);
    assert.ok(long.endsWith(".json") && long.length < 160);
    assert.notEqual(goldenFileName("get", "/goals?a=b"), goldenFileName("get", "/goals/a=b"));
  });

  it("정규화 규칙 — 시각 · UUID · cuid · 추적 키만 바꾸고 나머지는 그대로", () => {
    assert.deepEqual(
      normalize({ a: "2026-11-03", b: "550e8400-e29b-41d4-a716-446655440000", traceId: "x", n: 1, s: "SOL" }),
      { a: "2026-11-03", b: "<uuid>", traceId: "<trace>", n: 1, s: "SOL" },
    );
    assert.equal(firstDifference([1, 2], [1, 2, 3]), "$.length");
    assert.equal(firstDifference({ a: 1 }, { a: 1, b: 2 }), "$.b");
  });
});

describe("추적 ID (FR-7)", () => {
  it("들어온 traceparent 의 추적을 잇고 span 은 새로 — 없거나 틀리면 새 추적", () => {
    const incoming = "00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01";
    runInTrace(incoming, () => {
      const out = outgoingTraceparent();
      assert.match(out, /^00-4bf92f3577b34da6a3ce929d0e0e4736-[0-9a-f]{16}-01$/);
      assert.notEqual(out.split("-")[2], "00f067aa0ba902b7");
    });
    assert.match(traceIdFrom("garbage"), /^[0-9a-f]{32}$/);
    assert.notEqual(traceIdFrom(`00-${"0".repeat(32)}-00f067aa0ba902b7-01`), "0".repeat(32));
    assert.match(outgoingTraceparent(), /^00-[0-9a-f]{32}-[0-9a-f]{16}-01$/);
  });

  it("비동기 경계를 넘어도 같은 추적", async () => {
    await runInTrace("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01", async () => {
      await new Promise((r) => setTimeout(r, 5));
      assert.equal(outgoingTraceparent().split("-")[1], "4bf92f3577b34da6a3ce929d0e0e4736");
    });
  });
});
