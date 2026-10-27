import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { Request, Response } from "express";

import { DORMANT_PATHS, goneMiddleware } from "../goneMiddleware";

/**
 * 동면 경로 테스트.
 *
 * `app` 을 띄우지 않는다 — import 만으로 워커가 돈다. 미들웨어 응답과 목록 경계만 본다.
 */

const respond = (baseUrl: string) => {
  const sent: { status?: number; body?: Record<string, unknown> } = {};
  const res = {
    status(code: number) {
      sent.status = code;
      return this;
    },
    json(body: Record<string, unknown>) {
      sent.body = body;
      return this;
    },
  } as unknown as Response;
  goneMiddleware({ baseUrl, method: "GET" } as Request, res);
  return sent;
};

describe("동면 경로", () => {
  it("404 가 아니라 410 + ENDPOINT_DORMANT · revivable 이다 (SRV-REQ-009 FR-7 · 8)", () => {
    for (const path of DORMANT_PATHS) {
      const { status, body } = respond(path);
      assert.equal(status, 410, path);
      assert.equal(body?.code, "ENDPOINT_DORMANT");
      assert.equal(body?.revivable, true);
    }
  });

  it("살아 있는 경로와 겹치지 않는다 — 같은 라우터의 유지 경로는 목록 밖", () => {
    for (const live of [
      "/api/users/profile",
      "/api/investment-insight/insights",
      "/api/investment-notifications/unread-count",
      "/api/market-intelligence/BTC/dashboard",
    ]) {
      assert.ok(
        !DORMANT_PATHS.some((p) => live === p || live.startsWith(`${p}/`)),
        live,
      );
    }
  });
});
