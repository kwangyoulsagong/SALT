import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appArticleBodyService } from "../app-article-body.service";
import { toArticleBodyVM } from "../article-body.viewmodel";
import { backendApi } from "../backend-api.service";

const httpError = (status: number, code?: string) => Object.assign(new Error(`HTTP ${status}`), { response: { status, data: { code, message: "x" } } });

describe("기사 본문 뷰모델(BFF-REQ-053)", () => {
  it("문단 그대로 · 서버 failed = unavailable · 빈 문단 = not_found", () => {
    assert.deepEqual(toArticleBodyVM({ status: "ok", paragraphs: ["가.", "나."], originalUrl: "https://press.example/1", fetchedAt: "t" }), {
      status: "ok",
      paragraphs: ["가.", "나."],
      originalUrl: "https://press.example/1",
    });
    assert.deepEqual(toArticleBodyVM({ status: "failed", paragraphs: [], originalUrl: null }), { status: "unavailable" });
    assert.deepEqual(toArticleBodyVM({ status: "not_found", paragraphs: [], originalUrl: null }), { status: "not_found" });
    assert.deepEqual(toArticleBodyVM({ status: "ok", paragraphs: [], originalUrl: null }), { status: "not_found" });
  });

  it("모르는 status · 글자가 아닌 문단은 계약 깨짐", () => {
    assert.throws(() => toArticleBodyVM({ status: "partial", paragraphs: [] }));
    assert.throws(() => toArticleBodyVM({ status: "ok", paragraphs: [1], originalUrl: null }));
    assert.throws(() => toArticleBodyVM(null));
  });
});

describe("기사 본문 서비스 — 경로 · 실패 격리", () => {
  afterEach(() => mock.restoreAll());

  it("코인 · 국내 경로를 그대로 부른다(15초 예산)", async () => {
    const calls: Array<{ path: string; timeout?: number }> = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, path: string, _t: string, _b: unknown, opts?: { timeout?: number }) => {
      calls.push({ path, timeout: opts?.timeout });
      return { data: { data: { status: "ok", paragraphs: ["가."], originalUrl: null } } };
    });
    await appArticleBodyService.coin("t", "3d374335-f59c-453e-b7da-ce437d4236c9");
    await appArticleBodyService.kr("t", "005930", "20261109100000000001");
    assert.deepEqual(calls, [
      { path: "/news/3d374335-f59c-453e-b7da-ce437d4236c9/body", timeout: 15_000 },
      { path: "/market/kr/005930/news/20261109100000000001/body", timeout: 15_000 },
    ]);
  });

  it("401 · 404 는 그대로 올리고 503 · 5xx · 시간 초과 · 계약 깨짐은 unavailable", async () => {
    const run = async (fail: unknown) => {
      mock.restoreAll();
      mock.method(backendApi, "proxyAuthRequest", async () => {
        if (fail instanceof Error) throw fail;
        return { data: { data: fail } };
      });
      return appArticleBodyService.coin("t", "3d374335-f59c-453e-b7da-ce437d4236c9");
    };
    await assert.rejects(run(httpError(401)));
    await assert.rejects(run(httpError(404, "NEWS_ARTICLE_NOT_FOUND")));
    assert.deepEqual(await run(httpError(503, "NEWS_BODY_UNAVAILABLE")), { status: "unavailable" });
    assert.deepEqual(await run(httpError(502)), { status: "unavailable" });
    assert.deepEqual(await run(Object.assign(new Error("timeout of 15000ms exceeded"), { code: "ECONNABORTED" })), { status: "unavailable" });
    assert.deepEqual(await run({ status: "weird" }), { status: "unavailable" });
  });
});
