import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { AppError } from "../../../utils/error.util";
import { errorMiddleware } from "../error.middleware";

const fakeRes = () => {
  const out: { status: number; body: unknown; headers: Record<string, string> } = {
    status: 200,
    body: undefined,
    headers: {},
  };
  const res = {
    status(code: number) {
      out.status = code;
      return this;
    },
    json(body: unknown) {
      out.body = body;
      return this;
    },
    setHeader(name: string, value: string) {
      out.headers[name] = value;
      return this;
    },
  } as unknown as Response;
  return { res, out };
};

const req = { url: "/x", method: "GET" } as Request;
const next = (() => undefined) as NextFunction;

const upstream = (
  status: number,
  data: unknown,
  headers: Record<string, unknown> = {},
) => Object.assign(new Error(`Request failed with status code ${status}`), {
  response: { status, data, headers },
});

describe("errorMiddleware", () => {
  it("서버 429 를 500 으로 바꾸지 않고 Retry-After 를 옮긴다", () => {
    const { res, out } = fakeRes();
    errorMiddleware(
      upstream(429, { success: false, code: "COACH_COOLDOWN", message: "cooldown" }, { "retry-after": "42" }),
      req,
      res,
      next,
    );
    assert.equal(out.status, 429);
    assert.equal(out.headers["Retry-After"], "42");
    assert.deepEqual(out.body, { success: false, code: "COACH_COOLDOWN", message: "cooldown" });
  });

  it("서버 422 · 404 · 401 은 원 status 와 code 를 보존한다", () => {
    for (const status of [401, 404, 422]) {
      const { res, out } = fakeRes();
      errorMiddleware(upstream(status, { code: "C", message: "m" }), req, res, next);
      assert.equal(out.status, status);
      assert.deepEqual(out.body, { success: false, code: "C", message: "m" });
      assert.equal(out.headers["Retry-After"], undefined);
    }
  });

  it("본문이 비어도 status 는 보존한다", () => {
    const { res, out } = fakeRes();
    errorMiddleware(upstream(403, undefined), req, res, next);
    assert.equal(out.status, 403);
    assert.deepEqual(out.body, { success: false, message: "Request failed" });
  });

  it("서버 5xx 는 기존대로 500 — 이번 범위 밖", () => {
    const { res, out } = fakeRes();
    errorMiddleware(upstream(503, { message: "db down" }), req, res, next);
    assert.equal(out.status, 500);
  });

  it("응답 없는 에러(timeout)는 500", () => {
    const { res, out } = fakeRes();
    errorMiddleware(Object.assign(new Error("timeout"), { code: "ECONNABORTED" }), req, res, next);
    assert.equal(out.status, 500);
  });

  it("AppError 는 그 status 그대로", () => {
    const { res, out } = fakeRes();
    errorMiddleware(new AppError("explain_busy", 429), req, res, next);
    assert.equal(out.status, 429);
    assert.deepEqual(out.body, { success: false, message: "explain_busy" });
  });
});
