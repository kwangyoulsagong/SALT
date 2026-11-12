import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, it, mock } from "node:test";

import { appCryptoWhyMovedService } from "../app-crypto-why-moved.service";
import { appKrStockService } from "../app-kr-stock.service";
import { backendApi } from "../backend-api.service";
import { toMoveSummaryVM, toWhyMovedVM, withMoveSummary } from "../why-moved.viewmodel";

/** F016 단계 C — 오늘 왜 움직였나 뷰모델 · 경로(BFF-REQ-051 FR-1 · 6 · 7) */

const ok = (data: unknown) => ({ data: { success: true, data } }) as never;
const isThird = (path: unknown) => String(path).startsWith("/ai-coach/move-summary");
/** ①② 경로만 `impl`, ③ 경로는 `third`(기본 pending) — 두 경로를 병렬로 부른다(F016 단계 D) */
const byPath =
  (impl: () => Promise<unknown>, third: () => Promise<unknown> = async () => ok({ gate: "pending", summary: null, date: "2026-11-09" })) =>
  async (_m: unknown, path: unknown) =>
    (isThird(path) ? third() : impl()) as never;
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
    const call = mock.method(backendApi, "proxyAuthRequest", byPath(async () => ok(SERVER)));
    const r = await appKrStockService.getWhyMoved("t", "005930");
    assert.deepEqual(call.mock.calls.map((c) => c.arguments[1]).sort(), ["/ai-coach/move-summary?asset=kr&symbol=005930", "/market/kr/005930/why-moved"]);
    assert.ok(r.status === "ok" && r.split?.sectorIndex === "0013");
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", byPath(async () => {
      throw httpError(404, "KR_STOCK_NOT_AVAILABLE");
    }));
    await assert.rejects(() => appKrStockService.getWhyMoved("t", "005930"), /status 404/);
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", byPath(async () => ok({ ...SERVER, split: { total: -8 } })));
    assert.deepEqual(await appKrStockService.getWhyMoved("t", "005930"), { status: "unavailable" });
  });

  it("코인 — 서버 경로 · 800ms 예산 · 404 모르는 종목은 그대로 · 5xx 한 번 다시 뒤 unavailable", async () => {
    const call = mock.method(backendApi, "proxyAuthRequest", byPath(async () => ok({ ...SERVER, symbol: "ETH" })));
    const r = await appCryptoWhyMovedService.get("t", "ETH");
    const card = call.mock.calls.find((c) => !isThird(c.arguments[1]))!;
    assert.equal(card.arguments[1], "/investment/crypto/ETH/why-moved");
    assert.equal((card.arguments[4] as { timeout: number }).timeout, 800);
    assert.equal(r.status, "ok");
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", byPath(async () => {
      throw httpError(404, "MARKET_SYMBOL_NOT_FOUND");
    }));
    await assert.rejects(() => appCryptoWhyMovedService.get("t", "NOPE"), /status 404/);
    mock.restoreAll();
    const failing = mock.method(backendApi, "proxyAuthRequest", byPath(async () => {
      throw httpError(500);
    }));
    assert.deepEqual(await appCryptoWhyMovedService.get("t", "ETH"), { status: "unavailable" });
    assert.equal(failing.mock.calls.filter((c) => !isThird(c.arguments[1])).length, 2);
  });
});

describe("③ 한 줄 — 뷰모델 · 붙이기 · 경로(F016 단계 D · BFF-REQ-051 FR-1 · 7)", () => {
  afterEach(() => mock.restoreAll());
  const SUMMARY = { text: "반도체 약세 기사가 있었어요[1].", citations: ["kr-news:s1"], label: "ai", generatedAt: "2026-11-09T02:00:00.000Z" };

  it("toMoveSummaryVM — 아는 gate 만 · 모양이 깨지면 계약 깨짐 · BFF 전용 unavailable 은 서버가 못 준다", () => {
    assert.deepEqual(toMoveSummaryVM({ gate: "ok", summary: SUMMARY, date: "x" }), { gate: "ok", summary: SUMMARY });
    assert.deepEqual(toMoveSummaryVM({ gate: "pending", summary: null }), { gate: "pending", summary: null });
    assert.throws(() => toMoveSummaryVM({ gate: "magic", summary: null }), /gate/);
    assert.throws(() => toMoveSummaryVM({ gate: "unavailable", summary: null }), /gate/);
    assert.throws(() => toMoveSummaryVM({ gate: "ok", summary: { ...SUMMARY, label: "robot" } }), /label/);
    assert.throws(() => toMoveSummaryVM({ gate: "ok", summary: { ...SUMMARY, citations: [1] } }), /citations/);
  });

  it("withMoveSummary — 인용이 지금 사실에 다 있을 때만 · 아니면 pending · AI 인데 인용 0 이면 싣지 않음 · 서버 문장은 그대로", () => {
    const card = toWhyMovedVM(SERVER);
    assert.equal(withMoveSummary(card, { gate: "ok", summary: { ...SUMMARY, label: "ai" } }).gate, "ok");
    assert.deepEqual(
      withMoveSummary(card, { gate: "ok", summary: { ...SUMMARY, label: "ai", citations: ["kr-news:s1", "gone"] } }),
      { ...card, summary: null, gate: "pending" }
    );
    assert.equal(withMoveSummary(card, { gate: "ok", summary: { ...SUMMARY, label: "ai", citations: [] } }).summary, null);
    const quiet = { text: "종목만의 뚜렷한 소식은 찾지 못했어요", citations: [], label: "server" as const, generatedAt: null };
    assert.deepEqual(withMoveSummary(card, { gate: "quiet", summary: quiet }).summary, quiet);
  });

  it("경로 — ③ 실패(5xx · 시간 초과)는 카드를 막지 않는다: gate unavailable · ①② 그대로", async () => {
    mock.method(backendApi, "proxyAuthRequest", byPath(async () => ok(SERVER), async () => {
      throw httpError(500);
    }));
    const r = await appKrStockService.getWhyMoved("t", "005930");
    assert.ok(r.status === "ok");
    assert.equal(r.gate, "unavailable");
    assert.equal(r.summary, null);
    assert.equal(r.split?.total, -8);
  });

  it("경로 — ③ ok 면 문장 · 코인도 같은 규칙 · 401 이어도 카드는 선다", async () => {
    mock.method(backendApi, "proxyAuthRequest", byPath(async () => ok(SERVER), async () => ok({ gate: "ok", summary: SUMMARY })));
    const kr = await appKrStockService.getWhyMoved("t", "005930");
    assert.ok(kr.status === "ok" && kr.summary?.text === SUMMARY.text);
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", byPath(async () => ok({ ...SERVER, symbol: "ETH" }), async () => {
      throw httpError(401);
    }));
    const coin = await appCryptoWhyMovedService.get("t", "ETH");
    assert.ok(coin.status === "ok" && coin.gate === "unavailable");
  });
});
