import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { appTipsService, TIP_FOR_ME_BUDGET_MS } from "../app-tips.service";
import { backendApi } from "../backend-api.service";

/** 금융 팁 계약 (`BFF-REQ-049`) — 공개 경로는 토큰 0 · 사용자 데이터 0, 때맞춘 팁은 늦으면 카드 없이, 401 은 숨기지 않는다 */
describe("AppTipsService", () => {
  afterEach(() => mock.restoreAll());

  const meta = { sourceUrl: "https://www.law.go.kr/x", sourceName: "법령", writtenOn: "2026-11-05", reviewedOn: "2026-11-05", baseYear: 2026, validUntil: "2026-12-31" };

  it("목록 — 토큰 없이(proxyRequest) · 서버 필드 그대로 · 모르는 필드는 버린다", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return { data: { data: { public: true, tips: [{ slug: "a", title: "t", summary: "s", status: "needs_check", noindex: true, meta, userId: "leak" }] } } } as never;
    });
    const auth = mock.method(backendApi, "proxyAuthRequest", async () => ({}) as never);
    const vm = await appTipsService.list();
    assert.deepEqual(seen, ["GET /content/tips"]);
    assert.equal(auth.mock.callCount(), 0);
    assert.deepEqual(vm, { public: true, tips: [{ slug: "a", title: "t", summary: "s", status: "needs_check", noindex: true, meta }] });
    assert.equal(JSON.stringify(vm).includes("leak"), false);
  });

  it("공개 플래그 꺼짐 — public=false · 빈 목록 그대로", async () => {
    mock.method(backendApi, "proxyRequest", async () => ({ data: { data: { public: false, tips: [] } } }) as never);
    assert.deepEqual(await appTipsService.list(), { public: false, tips: [] });
  });

  it("글 — slug 를 인코딩 · 본문 세 꼴 · 이력", async () => {
    let url = "";
    mock.method(backendApi, "proxyRequest", async (_m: string, u: string) => {
      url = u;
      return {
        data: {
          data: {
            slug: "a", title: "t", summary: "s", status: "published", noindex: false, meta,
            body: [{ type: "heading", text: "h", items: null }, { type: "paragraph", text: "p", items: null }, { type: "bullets", text: null, items: ["x", "y"] }],
            revisions: [
              { revisedAt: "2026-12-01T00:00:00Z", summary: "연장", changes: [{ op: "removed", text: "유효기한: 2026-12-31" }, { op: "added", text: "유효기한: 2027-12-31" }] },
              { revisedAt: "2026-11-05T00:00:00Z", summary: "첫 판", changes: null },
            ],
            quiz: { question: "q", choices: ["a", "b"], answer: 1 },
          },
        },
      } as never;
    });
    const vm = await appTipsService.detail("a/../b");
    assert.equal(url, "/content/tips/a%2F..%2Fb");
    assert.deepEqual(vm.body, [{ type: "heading", text: "h" }, { type: "paragraph", text: "p" }, { type: "bullets", items: ["x", "y"] }]);
    assert.deepEqual(vm.revisions, [
      { revisedAt: "2026-12-01T00:00:00Z", summary: "연장", changes: [{ op: "removed", text: "유효기한: 2026-12-31" }, { op: "added", text: "유효기한: 2027-12-31" }] },
      { revisedAt: "2026-11-05T00:00:00Z", summary: "첫 판", changes: null },
    ]);
    // 정답은 공개 글 계약에 없다 — 서버가 실수로 실어도 화면까지 가지 않는다
    assert.deepEqual(vm.quiz, { question: "q", choices: ["a", "b"] });
  });

  it("글 — 퀴즈 없는 글은 quiz null", async () => {
    mock.method(backendApi, "proxyRequest", async () => ({ data: { data: { slug: "a", title: "t", summary: "s", status: "published", noindex: false, meta, body: [], revisions: [], quiz: null } } }) as never);
    assert.equal((await appTipsService.detail("a")).quiz, null);
  });

  it("퀴즈 — 세션 없으면 공개 채점(토큰 0 · 기록 0 · collected 늘 false)", async () => {
    const seen: unknown[] = [];
    mock.method(backendApi, "proxyRequest", async (m: string, url: string, body: unknown) => {
      seen.push([m, url, body]);
      return { data: { data: { correct: true, answer: 1, explanation: "e", collected: true } } } as never;
    });
    const auth = mock.method(backendApi, "proxyAuthRequest", async () => ({}) as never);
    const vm = await appTipsService.answerQuiz(undefined, "a b", 1);
    assert.deepEqual(seen, [["POST", "/content/tips/a%20b/quiz", { choice: 1 }]]);
    assert.equal(auth.mock.callCount(), 0);
    assert.deepEqual(vm, { correct: true, answer: 1, explanation: "e", signedIn: false, collected: false });
  });

  it("퀴즈 — 세션 있으면 기록 경로 · collected 그대로 · 401 은 숨기지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string, token: string) => {
      assert.equal(url, "/content/me/quiz/a");
      assert.equal(token, "t");
      return { data: { data: { correct: true, answer: 0, explanation: "e", collected: true } } } as never;
    });
    const pub = mock.method(backendApi, "proxyRequest", async () => ({}) as never);
    assert.equal((await appTipsService.answerQuiz("t", "a", 0)).collected, true);
    assert.equal(pub.mock.callCount(), 0);

    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw Object.assign(new Error("401"), { response: { status: 401 } });
    });
    const fallback = mock.method(backendApi, "proxyRequest", async () => ({}) as never);
    await assert.rejects(appTipsService.answerQuiz("expired", "a", 0));
    assert.equal(fallback.mock.callCount(), 0);
  });

  it("퀴즈 — 보기 번호가 정수가 아니면 서버에 가지 않고 400", async () => {
    const pub = mock.method(backendApi, "proxyRequest", async () => ({}) as never);
    for (const bad of [Number.NaN, -1, 1.5]) {
      await assert.rejects(appTipsService.answerQuiz(undefined, "a", bad), (e: { statusCode: number; code: string }) => e.statusCode === 400 && e.code === "INVALID_QUIZ_CHOICE");
    }
    assert.equal(pub.mock.callCount(), 0);
  });

  it("카드 모음 — 서버 필드만", async () => {
    mock.method(backendApi, "proxyAuthRequest", async () =>
      ({ data: { data: { available: 5, cards: [{ slug: "a", title: "t", question: "q", answer: "x", explanation: "e", collectedAt: "2026-11-05T00:00:00Z", userId: "leak" }] } } }) as never,
    );
    const vm = await appTipsService.quizCards("t");
    assert.deepEqual(vm, { available: 5, cards: [{ slug: "a", title: "t", question: "q", answer: "x", explanation: "e", collectedAt: "2026-11-05T00:00:00Z" }] });
  });

  it("때맞춘 팁 — 맥락 세 값 밖이면 서버에 가지 않고 400", async () => {
    const auth = mock.method(backendApi, "proxyAuthRequest", async () => ({}) as never);
    await assert.rejects(appTipsService.forMe("t", "invest"), (e: { statusCode: number; code: string }) => e.statusCode === 400 && e.code === "INVALID_TIP_CONTEXT");
    assert.equal(auth.mock.callCount(), 0);
  });

  it("때맞춘 팁 — 서버 한 건 그대로 · 없으면 null", async () => {
    const tip = { slug: "a", title: "t", summary: "s", trigger: "goal_created:wedding", sourceUrl: meta.sourceUrl, sourceName: "법령", validUntil: "2026-12-31" };
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      assert.equal(url, "/content/me/tip?context=savings");
      return { data: { data: { tip } } } as never;
    });
    assert.deepEqual(await appTipsService.forMe("t", "savings"), { tip, degraded: false });
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => ({ data: { data: { tip: null } } }) as never);
    assert.deepEqual(await appTipsService.forMe("t", "home"), { tip: null, degraded: false });
  });

  it(`때맞춘 팁 — 예산(${TIP_FOR_ME_BUDGET_MS}ms)을 넘기거나 5xx 면 카드 없이 degraded, 401 은 그대로 던진다`, async () => {
    let options: { timeout?: number } = {};
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, _u: string, _t: string, _d: unknown, o: { timeout?: number }) => {
      options = o;
      throw Object.assign(new Error("timeout"), { code: "ECONNABORTED" });
    });
    assert.deepEqual(await appTipsService.forMe("t", "savings"), { tip: null, degraded: true });
    assert.equal(options.timeout, TIP_FOR_ME_BUDGET_MS);
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw Object.assign(new Error("502"), { response: { status: 502 } });
    });
    assert.deepEqual(await appTipsService.forMe("t", "savings"), { tip: null, degraded: true });
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async () => {
      throw Object.assign(new Error("401"), { response: { status: 401 } });
    });
    await assert.rejects(appTipsService.forMe("t", "savings"), (e: { response: { status: number } }) => e.response.status === 401);
  });

  it("닫기 — POST · slug 인코딩", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return { data: { data: { slug: "a b", dismissed: true } } } as never;
    });
    assert.deepEqual(await appTipsService.dismiss("t", "a b"), { slug: "a b", dismissed: true });
    assert.deepEqual(seen, ["POST /content/me/tips/a%20b/dismiss"]);
  });
});
