import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { NextFunction, Request, Response } from "express";

import { rateLimit } from "../rateLimit";
import { TooManyRequestsError } from "../httpErrors";

/**
 * 요청 제한 테스트.
 *
 * Express 를 띄우지 않는다 — 미들웨어는 `(req, res, next)` 함수일 뿐이고,
 * 우리가 확인할 것은 **몇 번째 요청부터 `next(error)` 가 오는가** 하나다.
 */

const request = (ip: string): Request => ({ ip }) as unknown as Request;
const response = {} as Response;

/** `next` 가 받은 인자를 모은다. 오류가 왔는지로 차단 여부를 본다. */
const runner = (limiter: ReturnType<typeof rateLimit>) => {
  const errors: unknown[] = [];
  const next: NextFunction = ((error?: unknown) => {
    errors.push(error);
  }) as NextFunction;

  return {
    errors,
    call: (ip: string) => limiter(request(ip), response, next),
  };
};

describe("rateLimit", () => {
  it("한도까지는 통과시키고 그 다음부터 429 를 준다", () => {
    const { errors, call } = runner(rateLimit({ windowMs: 60_000, max: 3 }));

    call("1.1.1.1");
    call("1.1.1.1");
    call("1.1.1.1");
    assert.deepEqual(errors, [undefined, undefined, undefined]);

    call("1.1.1.1");
    assert.equal(errors.length, 4);
    assert.ok(errors[3] instanceof TooManyRequestsError);
    assert.equal((errors[3] as TooManyRequestsError).statusCode, 429);
  });

  it("클라이언트마다 창이 따로다 — 한 명이 막혀도 다른 사람은 통과한다", () => {
    const { errors, call } = runner(rateLimit({ windowMs: 60_000, max: 1 }));

    call("1.1.1.1");
    call("1.1.1.1"); // 막힌다
    call("2.2.2.2"); // 다른 사람

    assert.equal(errors[0], undefined);
    assert.ok(errors[1] instanceof TooManyRequestsError);
    assert.equal(errors[2], undefined);
  });

  it("창이 지나면 다시 열린다", async () => {
    const { errors, call } = runner(rateLimit({ windowMs: 20, max: 1 }));

    call("1.1.1.1");
    call("1.1.1.1");
    assert.ok(errors[1] instanceof TooManyRequestsError);

    await new Promise((resolve) => setTimeout(resolve, 30));

    call("1.1.1.1");
    assert.equal(errors[2], undefined);
  });
});
