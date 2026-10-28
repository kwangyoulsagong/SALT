import assert from "node:assert/strict";
import { Writable } from "node:stream";
import { describe, it } from "node:test";

import winston from "winston";

import { appendExtraArgs } from "../logger";

/** 문자열로 넘긴 실패 원인이 사라지지 않는다 (2026-10-28). */
const capture = () => {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk, _enc, done) {
      lines.push(String(chunk).trim());
      done();
    },
  });
  const logger = winston.createLogger({
    format: winston.format.combine(appendExtraArgs(), winston.format.json()),
    transports: [new winston.transports.Stream({ stream })],
  });
  return { logger, lines };
};

describe("logger — 추가 인자", () => {
  it("문자열 · 여러 인자를 본문에 붙인다", () => {
    const { logger, lines } = capture();
    logger.error("Upbit API error:", "timeout");
    logger.error("Unhandled Rejection at:", "p", "reason:", "boom");
    assert.equal(JSON.parse(lines[0]).message, "Upbit API error: timeout");
    assert.equal(JSON.parse(lines[1]).message, "Unhandled Rejection at: p reason: boom");
  });

  it("객체 meta 는 본문에 붙이지 않고 그대로 둔다", () => {
    const { logger, lines } = capture();
    logger.warn("Request rejected 400", { reason: "size" });
    const row = JSON.parse(lines[0]);
    assert.equal(row.message, "Request rejected 400");
    assert.equal(row.reason, "size");
  });
});
