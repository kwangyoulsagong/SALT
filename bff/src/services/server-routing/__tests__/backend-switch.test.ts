import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";

/**
 * 실제 서버 호출 클라이언트(`backendApi`)로 스위치를 확인한다 — legacy · platform 흉내 서버 둘(`BFF-REQ-045` 수용 기준).
 * env 는 import 시점에 읽혀서, 모듈을 불러오기 전에 값을 넣는다(node:test 는 파일마다 프로세스가 따로다).
 */
type Hit = { method: string; url: string; traceparent?: string };
const hits = { legacy: [] as Hit[], platform: [] as Hit[] };

const serve = (name: "legacy" | "platform", body: (url: string) => unknown) =>
  http.createServer((req, res) => {
    hits[name].push({ method: req.method ?? "", url: req.url ?? "", traceparent: req.headers.traceparent as string | undefined });
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(body(req.url ?? "")));
  });

const legacy = serve("legacy", () => ({ success: true, data: { total: 1000, at: "2026-11-03T00:00:00Z" } }));
const platform = serve("platform", (url) => ({ success: true, data: { total: url.includes("diff") ? 999 : 1000, at: "2026-11-03T09:00:00Z" } }));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "bff-switch-"));
const routesFile = path.join(dir, "routes.json");

let backendApi: typeof import("../../backend-api.service").backendApi;
let runInTrace: typeof import("../trace").runInTrace;

const listen = (server: http.Server) => new Promise<number>((r) => server.listen(0, "127.0.0.1", () => r((server.address() as AddressInfo).port)));
const settle = () => new Promise((r) => setTimeout(r, 150));

before(async () => {
  const [lp, pp] = await Promise.all([listen(legacy), listen(platform)]);
  fs.writeFileSync(routesFile, JSON.stringify({ default: "legacy", routes: { "/goals": "shadow", "/platform": "platform" } }));
  process.env.BACKEND_API_URL = `http://127.0.0.1:${lp}/api`;
  process.env.PLATFORM_API_URL = `http://127.0.0.1:${pp}/api`;
  process.env.SERVER_ROUTES_FILE = routesFile;
  process.env.SHADOW_REPORT_DIR = path.join(dir, "shadow");
  ({ backendApi } = await import("../../backend-api.service"));
  ({ runInTrace } = await import("../trace"));
});

after(() => {
  legacy.close();
  platform.close();
});

const reset = () => {
  hits.legacy.length = 0;
  hits.platform.length = 0;
};

describe("서버 스위치 — backendApi", () => {
  it("platform 경로는 platform 으로만 · 추적 ID 를 싣는다", async () => {
    reset();
    await runInTrace("00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01", () => backendApi.proxyAuthRequest("GET", "/platform/ping/x", "t"));
    assert.equal(hits.legacy.length, 0);
    assert.equal(hits.platform.length, 1);
    assert.equal(hits.platform[0].url, "/api/platform/ping/x");
    assert.match(hits.platform[0].traceparent ?? "", /^00-4bf92f3577b34da6a3ce929d0e0e4736-/);
  });

  it("shadow 읽기는 legacy 응답을 돌려주고 platform 에도 보내 차이를 기록한다", async () => {
    reset();
    const response = await backendApi.proxyAuthRequest("GET", "/goals/diff", "t");
    assert.equal(response.data.data.total, 1000, "응답은 legacy 것");
    await settle();
    assert.equal(hits.legacy.length, 1);
    assert.equal(hits.platform.length, 1);
    const lines = fs.readdirSync(path.join(dir, "shadow")).flatMap((f) => fs.readFileSync(path.join(dir, "shadow", f), "utf8").trim().split("\n"));
    const record = JSON.parse(lines.at(-1) ?? "{}");
    assert.equal(record.match, false);
    assert.equal(record.firstDiff, "$.data.total", "시각은 무시, 숫자 차이만");
    assert.equal(JSON.stringify(record).includes("999"), false, "기록에 값이 남지 않는다");
  });

  it("shadow 경로라도 쓰기는 platform 으로 가지 않는다", async () => {
    reset();
    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) await backendApi.proxyAuthRequest(method, "/goals", "t", { a: 1 });
    await settle();
    assert.equal(hits.legacy.length, 4);
    assert.equal(hits.platform.length, 0);
  });

  it("값 하나로 되돌린다 — 재시작 없이", async () => {
    reset();
    fs.writeFileSync(routesFile, JSON.stringify({ default: "legacy", routes: { "/goals": "shadow", "/platform": "legacy" } }));
    fs.utimesSync(routesFile, new Date(), new Date(Date.now() + 5_000));
    await new Promise((r) => setTimeout(r, 1_100));
    await backendApi.proxyAuthRequest("GET", "/platform/ping/x", "t");
    assert.equal(hits.platform.length, 0);
    assert.equal(hits.legacy.length, 1);
  });
});
