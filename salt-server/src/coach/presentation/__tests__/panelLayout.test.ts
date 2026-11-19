import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { NextFunction, Request, Response } from "express";

import { toErrorResponse } from "../../../shared/presentation/errorMiddleware";
import type { CoachUseCases } from "../../application/api";
import { PANEL_LAYOUT_MAX_BYTES, panelLayoutBytes } from "../../domain";
import { CoachConversationController } from "../coachConversation.controller";

/** PC 패널 배치(F006 A절 · `SRV-REQ-029` FR-30 · `DB-REQ-021` FR-24) — 크기 경계 · 모양을 보지 않음 · 없으면 null */

const saved: unknown[] = [];
const useCases = {
  getPanelLayout: { execute: async (userId: string) => (userId === "has" ? { tree: { type: "panel", id: "chat" }, updatedAt: new Date("2026-11-19T00:00:00Z") } : null) },
  savePanelLayout: { execute: async (_u: string, _s: string, tree: unknown) => void saved.push(tree) },
} as unknown as CoachUseCases;
const controller = new CoachConversationController(useCases);

const call = async (handler: (req: Request, res: Response, next: NextFunction) => unknown, req: Partial<Request>) => {
  let status = 200;
  let body: unknown;
  let error: Error | undefined;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json(value: unknown) {
      body = value;
      return this;
    },
    end() {
      return this;
    },
  } as unknown as Response;
  await handler({ query: {}, body: {}, ...req } as Request, res, ((e?: Error) => (error = e)) as NextFunction);
  if (error) return { status: toErrorResponse(error).status, body: toErrorResponse(error).body };
  return { status, body };
};

/** 압축 JSON 이 정확히 `bytes` 바이트인 트리 */
const treeOfBytes = (bytes: number) => {
  const base = { type: "panel", id: "" };
  const pad = bytes - panelLayoutBytes(base);
  const tree = { type: "panel", id: "x".repeat(pad) };
  assert.equal(panelLayoutBytes(tree), bytes);
  return tree;
};

describe("PUT /api/coach/panel-layout", () => {
  it("16KB 정확히는 저장(204) · 1바이트 넘으면 413", async () => {
    const ok = await call(controller.savePanelLayout, { user: { userId: "u" }, body: { tree: treeOfBytes(PANEL_LAYOUT_MAX_BYTES) } } as never);
    assert.equal(ok.status, 204);
    const over = await call(controller.savePanelLayout, { user: { userId: "u" }, body: { tree: treeOfBytes(PANEL_LAYOUT_MAX_BYTES + 1) } } as never);
    assert.equal(over.status, 413);
  });

  it("한글 칸 이름은 글자 수가 아니라 바이트로 센다", () => {
    assert.equal(panelLayoutBytes({ id: "가" }), JSON.stringify({ id: "" }).length + 3);
  });

  it("모양은 보지 않는다 — 모르는 키가 있어도 객체면 저장", async () => {
    const res = await call(controller.savePanelLayout, { user: { userId: "u" }, body: { tree: { anything: [1, 2] } } } as never);
    assert.equal(res.status, 204);
    assert.deepEqual(saved.at(-1), { anything: [1, 2] });
  });

  for (const [name, tree] of [
    ["배열", [1]],
    ["문자열", "x"],
    ["없음", undefined],
  ] as const) {
    it(`tree 가 ${name}이면 400`, async () => {
      const res = await call(controller.savePanelLayout, { user: { userId: "u" }, body: { tree } } as never);
      assert.equal(res.status, 400);
    });
  }

  it("모르는 서피스는 400", async () => {
    const res = await call(controller.savePanelLayout, { user: { userId: "u" }, body: { surface: "mobile", tree: {} } } as never);
    assert.equal(res.status, 400);
  });
});

describe("GET /api/coach/panel-layout", () => {
  it("저장한 적이 없으면 tree null(기본 배치)", async () => {
    const res = await call(controller.getPanelLayout, { user: { userId: "none" } } as never);
    assert.deepEqual((res.body as { data: unknown }).data, { surface: "pc", tree: null, updatedAt: null });
  });

  it("있으면 그대로 · 시각은 ISO", async () => {
    const res = await call(controller.getPanelLayout, { user: { userId: "has" } } as never);
    assert.deepEqual((res.body as { data: unknown }).data, {
      surface: "pc",
      tree: { type: "panel", id: "chat" },
      updatedAt: "2026-11-19T00:00:00.000Z",
    });
  });
});
