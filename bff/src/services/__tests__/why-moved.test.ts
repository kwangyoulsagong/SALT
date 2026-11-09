import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it, mock } from "node:test";

import { appCryptoWhyMovedService } from "../app-crypto-why-moved.service";
import { appKrStockService } from "../app-kr-stock.service";
import { backendApi } from "../backend-api.service";
import { toWhyMovedVM } from "../why-moved.viewmodel";

/** F016 단계 C — 오늘 왜 움직였나 뷰모델 · 경로(BFF-REQ-051 FR-1 · 6 · 7) */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const httpError = (status: number, code?: string) =>
  Object.assign(new Error(`status ${status}`), { response: { status, data: { message: "x", ...(code ? { code } : {}) }, headers: {} } });

// 2026-11-09 09:14 서버 실응답 모양(삼성전자) + 모르는 kind · 이유 하나씩
const SERVER = {
  code: "005930",
  date: "2026-11-09",
  show: true,
  reasons: ["large_move", "brand_new_reason"],
  usualRate: 4.11,
  split: { total: -8, market: -3.6, sector: -1, idio: -3.4, method: "regression", marketIndex: "0001", sectorIndex: "0013", sectorName: "전기·전자" },
  facts: [
    { id: "kr-flow:program:x", kind: "flow", at: "2026-11-09T01:53:00.000Z", source: "KRX", title: "program", value: -60550831650 },
    { id: "kr-news:s1", kind: "news", at: "2026-11-09T01:30:00.000Z", source: "연합뉴스", title: "반도체 약세", value: null },
    { id: "x", kind: "future_kind", at: "2026-11-09T01:00:00.000Z", source: "?", title: "?", value: null },
  ],
  unavailable: ["vi", "future_kind"],
};

describe("toWhyMovedVM — 골라 옮기기 · 계산 0", () => {
  it("값은 서버 그대로(합 · 반올림 0) · 모르는 kind · 이유는 버린다 · 서버 전용 칸(code)은 옮기지 않는다", () => {
    const vm = toWhyMovedVM(SERVER);
    assert.deepEqual(vm.split, SERVER.split);
    assert.deepEqual(vm.reasons, ["large_move"]);
    assert.deepEqual(vm.facts.map((f) => f.kind), ["flow", "news"]);
    assert.equal(vm.facts[0]!.value, -60550831650);
    assert.deepEqual(vm.unavailable, ["vi"]);
    assert.deepEqual(Object.keys(vm).sort(), ["date", "facts", "reasons", "show", "split", "unavailable", "usualRate"]);
  });

  it("분해 없음(null) 은 그대로 · 모르는 method · 숫자 아닌 몫은 계약 깨짐(0 으로 채우지 않는다)", () => {
    assert.equal(toWhyMovedVM({ ...SERVER, show: false, split: null }).split, null);
    assert.throws(() => toWhyMovedVM({ ...SERVER, split: { ...SERVER.split, method: "magic" } }), /split.method/);
    assert.throws(() => toWhyMovedVM({ ...SERVER, split: { ...SERVER.split, idio: "1" } }), /idio/);
    assert.throws(() => toWhyMovedVM({ ...SERVER, show: "yes" }), /show/);
  });

  it("BFF 숫자 계산 0 — 뷰모델 파일에 산술 연산자가 없다(grep)", () => {
    // 주석 · 문자열(`"why-moved"` 의 하이픈) · 정규식을 빼고 본다
    const code = readFileSync(join(__dirname, "../why-moved.viewmodel.ts"), "utf8")
      .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")
      .replace(/`[^`]*`|"[^"\n]*"/g, '""')
      .replace(/=>|\|\||&&/g, "");
    assert.deepEqual(code.match(/[\w)\]]\s*[-+*/]\s*[\w(]/g) ?? [], []);
  });
});

describe("국내 · 코인 경로 — 실패 규칙", () => {
  afterEach(() => mock.restoreAll());

  it("국내 — 서버 경로 · ok + 뷰모델 · 비소유자 404 는 그대로 · 계약 깨짐은 unavailable", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok(SERVER));
    const r = await appKrStockService.getWhyMoved("t", "005930");
    assert.equal(call.mock.calls[0]!.arguments[1], "/market/kr/005930/why-moved");
    assert.ok(r.status === "ok" && r.split?.sectorIndex === "0013");
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(404, "KR_STOCK_NOT_AVAILABLE");
    });
    await assert.rejects(() => appKrStockService.getWhyMoved("t", "005930"), /status 404/);
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => ok({ ...SERVER, split: { total: -8 } }));
    assert.deepEqual(await appKrStockService.getWhyMoved("t", "005930"), { status: "unavailable" });
  });

  it("코인 — 서버 경로 · 800ms 예산 · 404 모르는 종목은 그대로 · 5xx 한 번 다시 뒤 unavailable", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", async () => ok({ ...SERVER, symbol: "ETH" }));
    const r = await appCryptoWhyMovedService.get("t", "ETH");
    assert.equal(call.mock.calls[0]!.arguments[1], "/investment/crypto/ETH/why-moved");
    assert.equal((call.mock.calls[0]!.arguments[4] as { timeout: number }).timeout, 800);
    assert.equal(r.status, "ok");
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(404, "MARKET_SYMBOL_NOT_FOUND");
    });
    await assert.rejects(() => appCryptoWhyMovedService.get("t", "NOPE"), /status 404/);
    mock.restoreAll();
    const failing = mock.method(backendApi, "proxyAuthRequest", async () => {
      throw httpError(500);
    });
    assert.deepEqual(await appCryptoWhyMovedService.get("t", "ETH"), { status: "unavailable" });
    assert.equal(failing.mock.callCount(), 2);
  });
});
