import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { MY_DATA_SCOPE } from "../app-my-data.service";
import { appPrivacyService, toAi, toGroups } from "../app-privacy.service";
import { backendApi } from "../backend-api.service";

/**
 * 개인정보(`BFF-REQ-046` FR-10 · FR-11, 서버 S3d). 불변식 넷
 * 1. 서비스 목록 = 지워지는 범위(`MY_DATA_SCOPE`) — "저장하는 것"과 "지워지는 것"이 같은 서비스를 가리킨다
 * 2. 등급 없는 표는 숨기지 않는다(`unknown` 묶음 · 표 이름) — 감추면 공개가 거짓
 * 3. 서비스 하나 실패 = 그 칸만 unavailable · 401 은 전체 401
 * 4. AI 입력에 personal 이 하나라도 있으면 personal true
 */
const axiosError = (status: number) =>
  Object.assign(new Error(`upstream ${status}`), { isAxiosError: true, response: { status, data: { success: false, message: "x" }, headers: {} } });

const classification = (service: string) => ({
  data: {
    data: {
      service,
      tables: [
        { table: "a", grade: "record", about: "기록 A" },
        { table: "b", grade: "sensitive", about: "감정" },
        { table: "c", grade: "financial", about: "지출" },
        { table: "d", grade: "record", about: "기록 D" },
      ],
      ...(service === "investment"
        ? { llmInputs: [{ job: "explanation", about: "종목 해설", inputs: [{ about: "종목 이름", personal: false }] }] }
        : {}),
    },
  },
});

describe("개인정보 — 뷰모델 모양", () => {
  it("묶음은 민감 → 금액 → 기록 → 모름 순 · 빈 묶음 없음 · 설명 순서 유지", () => {
    assert.deepEqual(toGroups(classification("x").data.data), [
      { grade: "sensitive", items: ["감정"] },
      { grade: "financial", items: ["지출"] },
      { grade: "record", items: ["기록 A", "기록 D"] },
    ]);
  });

  it("등급이 없거나 모르거나 설명이 없으면 unknown 에 표 이름으로 — 숨기지 않는다", () => {
    const groups = toGroups({ tables: [{ table: "x", grade: null, about: null }, { table: "y", grade: "secret", about: "?" }, { table: "z", grade: "record" }] });
    assert.deepEqual(groups, [{ grade: "unknown", items: ["x", "y", "z"] }]);
  });

  it("모양이 틀리면 null(못 읽음) — 빈 목록으로 접지 않는다", () => {
    for (const bad of [null, {}, { tables: "x" }, { tables: [{ grade: "record" }] }]) assert.equal(toGroups(bad), null, JSON.stringify(bad));
  });

  it("AI 입력 — personal 하나라도 true 면 true · 모양 틀리면 null", () => {
    assert.deepEqual(toAi({ llmInputs: [{ about: "해설", inputs: [{ about: "이름", personal: false }] }] }), { personal: false, jobs: [{ about: "해설", inputs: ["이름"] }] });
    assert.equal(toAi({ llmInputs: [{ about: "해설", inputs: [{ about: "보유", personal: true }, { about: "이름", personal: false }] }] })!.personal, true);
    assert.equal(toAi({}), null);
    assert.equal(toAi({ llmInputs: [{ about: "해설", inputs: [{ about: "이름" }] }] }), null);
  });
});

describe("개인정보 — 조립", () => {
  afterEach(() => mock.restoreAll());

  it("지워지는 범위의 서비스마다 등급 경로 · 그 순서 · AI 는 투자에서", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return classification(url.split("/")[1]) as never;
    });
    const vm = await appPrivacyService.privacy("t");
    assert.deepEqual(seen.sort(), MY_DATA_SCOPE.map((s) => `GET /${s}/me/data-classification`).sort());
    assert.deepEqual(vm.services.map((s) => s.service), [...MY_DATA_SCOPE]);
    assert.ok(vm.services.every((s) => !s.unavailable));
    assert.deepEqual(vm.ai, { personal: false, jobs: [{ about: "종목 해설", inputs: ["종목 이름"] }] });
  });

  it("서비스 하나 5xx = 그 칸만 unavailable · 투자 실패면 AI null", async () => {
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      if (url.startsWith("/investment")) throw axiosError(500);
      return classification(url.split("/")[1]) as never;
    });
    const vm = await appPrivacyService.privacy("t");
    assert.deepEqual(vm.services.filter((s) => s.unavailable).map((s) => s.service), ["investment"]);
    assert.equal(vm.ai, null);
  });

  it("하나라도 401 이면 전체 401 — 세션 갱신이 돌게", async () => {
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      if (url.startsWith("/savings")) throw axiosError(401);
      return classification("x") as never;
    });
    await assert.rejects(appPrivacyService.privacy("t"), (e: { response?: { status?: number } }) => e.response?.status === 401);
  });

  it("계측 — identity 로 그대로 넘긴다(값 판정은 서버) · 서버 400 은 그대로 올린다", async () => {
    const calls: unknown[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string, _t: string, body: unknown) => {
      calls.push([m, url, body]);
      if ((body as { domain?: unknown }).domain === "home") throw axiosError(400);
      return { data: { data: { counted: true } } } as never;
    });
    await appPrivacyService.countUsage("t", "invest", "card_click");
    assert.deepEqual(calls[0], ["POST", "/identity/me/usage", { domain: "invest", kind: "card_click" }]);
    await assert.rejects(appPrivacyService.countUsage("t", "home", "visit"), (e: { response?: { status?: number } }) => e.response?.status === 400);
  });
});
