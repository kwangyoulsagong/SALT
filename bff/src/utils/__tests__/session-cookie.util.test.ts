import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IncomingHttpHeaders } from "http";
import type { Request, Response } from "express";

import { cookieSessionMiddleware } from "../../rest/middleware/cookieSession.middleware";
import { isAllowedSocketOrigin, isSameOriginRequest, readCookie, webOrigins } from "../session-cookie.util";

const ORIGINS = ["http://localhost:3000"];

describe("readCookie", () => {
  it("이름이 정확히 같은 것만 · 빈 값은 없음", () => {
    const rows: Array<[string | undefined, string | undefined]> = [
      [undefined, undefined],
      ["", undefined],
      ["salt_at=abc", "abc"],
      ["x=1; salt_at=a.b.c; y=2", "a.b.c"],
      ["salt_at_old=zzz", undefined],
      ["my_salt_at=zzz", undefined],
      ["salt_at=", undefined],
      [`salt_at=${"a".repeat(4097)}`, undefined],
    ];
    for (const [header, expected] of rows) assert.equal(readCookie(header, "salt_at"), expected, String(header));
  });
});

describe("isSameOriginRequest — 경계 표", () => {
  const rows: Array<[IncomingHttpHeaders, boolean]> = [
    [{ "sec-fetch-site": "same-origin" }, true],
    [{ "sec-fetch-site": "none" }, true],
    [{ "sec-fetch-site": "same-site" }, false],
    [{ "sec-fetch-site": "cross-site", origin: "http://localhost:3000" }, false],
    [{}, true],
    [{ origin: "http://localhost:3000" }, true],
    [{ origin: "https://evil.example" }, false],
  ];
  for (const [headers, expected] of rows) {
    it(`${JSON.stringify(headers)} → ${expected}`, () => assert.equal(isSameOriginRequest(headers, ORIGINS), expected));
  }
});

describe("isAllowedSocketOrigin", () => {
  it("허용 목록의 Origin 만 — 없으면 아니오", () => {
    assert.equal(isAllowedSocketOrigin({ origin: "http://localhost:3000" }, ORIGINS), true);
    assert.equal(isAllowedSocketOrigin({ origin: "http://localhost:3001" }, ORIGINS), false);
    assert.equal(isAllowedSocketOrigin({}, ORIGINS), false);
  });
});

describe("webOrigins", () => {
  it("쉼표 목록 · 기본은 로컬 셸", () => {
    assert.deepEqual(webOrigins({}), ["http://localhost:3000"]);
    assert.deepEqual(webOrigins({ WEB_ORIGINS: "https://a.example, https://b.example" }), ["https://a.example", "https://b.example"]);
  });
});

describe("cookieSessionMiddleware", () => {
  const run = (headers: IncomingHttpHeaders) => {
    const req = { headers: { ...headers } } as unknown as Request;
    let called = 0;
    cookieSessionMiddleware(ORIGINS)(req, {} as Response, () => {
      called += 1;
    });
    assert.equal(called, 1);
    return req.headers.authorization;
  };

  it("헤더가 있으면(앱) 쿠키를 보지 않는다", () => {
    assert.equal(run({ authorization: "Bearer app", cookie: "salt_at=web", "sec-fetch-site": "same-origin" }), "Bearer app");
  });
  it("같은 origin + 쿠키 → Authorization", () => {
    assert.equal(run({ cookie: "salt_at=web", "sec-fetch-site": "same-origin" }), "Bearer web");
  });
  it("다른 사이트에서 온 쿠키는 토큰이 되지 않는다(CSRF)", () => {
    assert.equal(run({ cookie: "salt_at=web", "sec-fetch-site": "cross-site" }), undefined);
  });
  it("쿠키가 없으면 그대로", () => {
    assert.equal(run({ "sec-fetch-site": "same-origin" }), undefined);
  });
});
