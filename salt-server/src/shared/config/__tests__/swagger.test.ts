import assert from "node:assert/strict";
import { it } from "node:test";

import swaggerJsdoc from "swagger-jsdoc";

import { swaggerOptions } from "../swagger";

/**
 * Swagger 문서가 오류 없이 만들어진다 — 주석 YAML 이 깨지면(응답 키 중복 등) swagger-jsdoc 은 기본으로 그 파일을 **조용히 빼고**
 * 부팅 로그에만 찍는다. 국내 주식 경로 넷이 열흘 동안 문서에서 빠져 있었다(`401` 두 번, 2026-11-10 ~ 11-19). 기계가 센다.
 */
it("모든 경로 파일의 Swagger 주석이 오류 없이 읽힌다", () => {
  assert.doesNotThrow(() => swaggerJsdoc({ ...swaggerOptions, failOnErrors: true }));
});
