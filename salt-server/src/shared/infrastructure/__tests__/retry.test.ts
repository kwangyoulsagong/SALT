import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isRetryableHttpError, withRetry } from "../retry";

/**
 * 재시도 정책 테스트.
 *
 * **대기 시간을 0 으로 주고 잰다** — 백오프가 실제로 늘어나는지는 `onRetry` 가 받는
 * `waitMs` 로 본다. 진짜로 기다리면 테스트가 그 시간만큼 느려지고, 그러면 아무도
 * 안 돌린다.
 */

describe("withRetry", () => {
  it("성공하면 한 번만 부른다", async () => {
    let calls = 0;
    const result = await withRetry(async () => {
      calls++;
      return "ok";
    });

    assert.equal(result, "ok");
    assert.equal(calls, 1);
  });

  it("실패하면 상한까지 다시 걸고 마지막 오류를 올린다", async () => {
    let calls = 0;

    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw new Error(`실패 ${calls}`);
        },
        { retries: 2, baseDelayMs: 0 }
      ),
      /실패 3/
    );

    // 최초 1회 + 재시도 2회
    assert.equal(calls, 3);
  });

  it("대기가 2배씩 늘어난다", async () => {
    const waits: number[] = [];

    await assert.rejects(
      withRetry(
        async () => {
          throw new Error("x");
        },
        {
          retries: 3,
          baseDelayMs: 100,
          onRetry: (_error, _attempt, waitMs) => waits.push(waitMs),
        }
      )
    );

    assert.deepEqual(waits, [100, 200, 400]);
  });

  it("재시도 상한은 3 이다 — 더 크게 줘도 3 에서 멈춘다", async () => {
    let calls = 0;

    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw new Error("x");
        },
        { retries: 10, baseDelayMs: 0 }
      )
    );

    assert.equal(calls, 4);
  });

  it("재시도할 성격이 아니면 즉시 올린다", async () => {
    let calls = 0;

    await assert.rejects(
      withRetry(
        async () => {
          calls++;
          throw Object.assign(new Error("bad request"), {
            response: { status: 400 },
          });
        },
        { retries: 3, baseDelayMs: 0, isRetryable: isRetryableHttpError }
      ),
      /bad request/
    );

    assert.equal(calls, 1);
  });

  it("중간에 성공하면 거기서 멈춘다", async () => {
    let calls = 0;

    const result = await withRetry(
      async () => {
        calls++;
        if (calls < 3) throw new Error("아직");
        return "늦게 성공";
      },
      { retries: 3, baseDelayMs: 0 }
    );

    assert.equal(result, "늦게 성공");
    assert.equal(calls, 3);
  });
});

describe("isRetryableHttpError", () => {
  const withStatus = (status: number) => ({ response: { status } });

  it("429 와 5xx 는 다시 건다", () => {
    assert.equal(isRetryableHttpError(withStatus(429)), true);
    assert.equal(isRetryableHttpError(withStatus(500)), true);
    assert.equal(isRetryableHttpError(withStatus(503)), true);
  });

  it("4xx 는 몇 번을 걸어도 같은 답이라 걸지 않는다", () => {
    assert.equal(isRetryableHttpError(withStatus(400)), false);
    assert.equal(isRetryableHttpError(withStatus(401)), false);
    assert.equal(isRetryableHttpError(withStatus(404)), false);
  });

  it("응답이 없으면(타임아웃·네트워크) 다시 건다", () => {
    assert.equal(isRetryableHttpError(new Error("ECONNRESET")), true);
  });
});
