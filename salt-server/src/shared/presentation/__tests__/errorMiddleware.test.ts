import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { NextFunction, Request, Response } from "express";
import { z } from "zod";

import { logger } from "../../config/logger";
import { DomainError, ErrorKind } from "../../domain/DomainError";
import { errorMiddleware, toErrorResponse } from "../errorMiddleware";
import { UnauthorizedError } from "../httpErrors";

class BlockedError extends DomainError {
  constructor() {
    super("SOME_BLOCKED", ErrorKind.Blocked, "blocked");
  }
}

const zodError = () => {
  const parsed = z.object({ size: z.number().max(50) }).safeParse({ size: 500 });
  assert.equal(parsed.success, false);
  return parsed.error!;
};

/** 응답과 로그 레벨을 함께 잰다. 로거는 바꿔 끼웠다가 되돌린다. */
const run = (err: Error) => {
  const calls: { level: "warn" | "error"; meta: Record<string, unknown> }[] = [];
  const original = { warn: logger.warn, error: logger.error };
  logger.warn = ((_: string, meta: Record<string, unknown>) => {
    calls.push({ level: "warn", meta });
    return logger;
  }) as typeof logger.warn;
  logger.error = ((_: string, meta: Record<string, unknown>) => {
    calls.push({ level: "error", meta });
    return logger;
  }) as typeof logger.error;

  let status = 0;
  const res = {
    status(code: number) {
      status = code;
      return this;
    },
    json() {
      return this;
    },
  } as unknown as Response;

  try {
    errorMiddleware(err, { url: "/x", method: "GET" } as Request, res, (() => {}) as NextFunction);
  } finally {
    logger.warn = original.warn;
    logger.error = original.error;
  }
  return { status, calls };
};

describe("errorMiddleware — 4xx 는 warn, 5xx 만 error", () => {
  it("Zod 400 → warn 한 줄 · 스택 없음", () => {
    const { status, calls } = run(zodError());
    assert.equal(status, 400);
    assert.deepEqual(calls.map((c) => c.level), ["warn"]);
    assert.equal(calls[0].meta.stack, undefined);
    assert.equal(toErrorResponse(zodError()).code, "VALIDATION_ERROR");
    // 여러 줄 Zod JSON 이 아니라 한 줄 사유
    assert.equal(calls[0].meta.reason, "size: Too big: expected number to be <=50");
  });

  it("인증 없음 401 · 도메인 422 → warn", () => {
    assert.deepEqual(run(new UnauthorizedError("No token provided")).calls.map((c) => c.level), ["warn"]);
    assert.equal(toErrorResponse(new UnauthorizedError("x")).code, "UnauthorizedError");
    const blocked = run(new BlockedError());
    assert.equal(blocked.status, 422);
    assert.equal(blocked.calls[0].level, "warn");
    assert.equal(blocked.calls[0].meta.reason, "blocked");
    assert.equal(toErrorResponse(new BlockedError()).code, "SOME_BLOCKED");
  });

  it("모르는 예외 500 → error + 스택", () => {
    const { status, calls } = run(new Error("boom"));
    assert.equal(status, 500);
    assert.deepEqual(calls.map((c) => c.level), ["error"]);
    assert.ok(typeof calls[0].meta.stack === "string");
  });

  it("응답 본문은 전과 같다", () => {
    assert.deepEqual(toErrorResponse(new BlockedError()).body, {
      success: false,
      code: "SOME_BLOCKED",
      message: "blocked",
    });
    assert.equal(toErrorResponse(zodError()).body.message, "Validation error");
  });
});
