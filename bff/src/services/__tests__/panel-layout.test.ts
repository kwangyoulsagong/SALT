import assert from "node:assert/strict";
import { afterEach, describe, it, mock } from "node:test";

import { backendApi } from "../backend-api.service";
import { coachConversationService, PANEL_LAYOUT_MAX_BYTES } from "../coach-conversation.service";

/** PC 패널 배치(F006 A절 · `BFF-REQ-027` FR-50~52) — 객체 · 크기만 보고, 읽기 실패는 기본 배치로 */

const upstreamError = (status: number) => Object.assign(new Error(`upstream ${status}`), { response: { status, data: { message: "x" } } });

describe("coachConversationService.getPanelLayout", () => {
  afterEach(() => mock.restoreAll());

  it("서버 값을 그대로(모양은 보지 않는다)", async () => {
    const calls: unknown[][] = [];
    mock.method(backendApi, "proxyAuthRequest", async (...args: unknown[]) => {
      calls.push(args);
      return { data: { success: true, data: { surface: "pc", tree: { anything: 1 }, updatedAt: "2026-11-19T00:00:00.000Z" } } } as never;
    });
    assert.deepEqual(await coachConversationService.getPanelLayout("t"), {
      tree: { anything: 1 },
      updatedAt: "2026-11-19T00:00:00.000Z",
      degraded: false,
    });
    assert.deepEqual(calls[0].slice(0, 2), ["GET", "/coach/panel-layout?surface=pc"]);
  });

  it("저장한 적 없음 · 배열 · 원시값 → tree null", async () => {
    for (const tree of [null, [1], "x"]) {
      mock.method(backendApi, "proxyAuthRequest", async () => ({ data: { success: true, data: { tree, updatedAt: null } } }) as never);
      assert.equal((await coachConversationService.getPanelLayout("t")).tree, null);
      mock.restoreAll();
    }
  });

  it("5xx · 시간 초과는 기본 배치(degraded) — 오류를 앞세우지 않는다(FR-52)", async () => {
    for (const error of [upstreamError(500), upstreamError(504), Object.assign(new Error("timeout"), { code: "ECONNABORTED" })]) {
      mock.method(backendApi, "proxyAuthRequest", async () => {
        throw error;
      });
      assert.deepEqual(await coachConversationService.getPanelLayout("t"), { tree: null, updatedAt: null, degraded: true });
      mock.restoreAll();
    }
  });

  it("401 · 403 은 그대로 던진다(화면이 로그인으로)", async () => {
    for (const status of [401, 403]) {
      mock.method(backendApi, "proxyAuthRequest", async () => {
        throw upstreamError(status);
      });
      await assert.rejects(coachConversationService.getPanelLayout("t"), new RegExp(`upstream ${status}`));
      mock.restoreAll();
    }
  });
});

describe("coachConversationService.savePanelLayout", () => {
  afterEach(() => mock.restoreAll());

  const treeOfBytes = (bytes: number) => {
    const pad = bytes - Buffer.byteLength(JSON.stringify({ id: "" }));
    return { id: "x".repeat(pad) };
  };

  it("16KB 정확히는 서버로(surface pc) · 1바이트 넘으면 서버를 부르지 않고 413", async () => {
    const put = mock.method(backendApi, "proxyAuthRequest", async () => ({ status: 204, data: "" }) as never);
    await coachConversationService.savePanelLayout("t", { tree: treeOfBytes(PANEL_LAYOUT_MAX_BYTES) });
    assert.deepEqual(put.mock.calls[0].arguments.slice(0, 3), ["PUT", "/coach/panel-layout", "t"]);
    assert.equal((put.mock.calls[0].arguments[3] as { surface: string }).surface, "pc");
    await assert.rejects(coachConversationService.savePanelLayout("t", { tree: treeOfBytes(PANEL_LAYOUT_MAX_BYTES + 1) }), (e: { statusCode?: number; code?: string }) => e.statusCode === 413 && e.code === "PANEL_LAYOUT_TOO_LARGE");
    assert.equal(put.mock.callCount(), 1);
  });

  it("객체가 아니면 400 · 서버 0회", async () => {
    const put = mock.method(backendApi, "proxyAuthRequest", async () => ({}) as never);
    for (const body of [{}, { tree: [1] }, { tree: "x" }, null]) {
      await assert.rejects(coachConversationService.savePanelLayout("t", body), (e: { statusCode?: number }) => e.statusCode === 400);
    }
    assert.equal(put.mock.callCount(), 0);
  });
});
