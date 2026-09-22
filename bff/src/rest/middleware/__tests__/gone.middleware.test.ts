import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AddressInfo } from "node:net";

import app from "../../app";
import { DORMANT_PATHS } from "../gone.middleware";

const call = async (method: string, path: string) => {
  const server = app.listen(0);
  try {
    const { port } = server.address() as AddressInfo;
    const res = await fetch(`http://127.0.0.1:${port}${path}`, { method });
    return { status: res.status, body: await res.json() };
  } finally {
    // fetch 의 keep-alive 소켓이 남으면 close 가 끝나지 않고 테스트 러너가 멈춘다
    server.closeAllConnections();
    server.close();
  }
};

describe("동면 경로", () => {
  it("등록 해제된 경로는 404 가 아니라 410 이다 — 하위 경로 · 메서드 무관", async () => {
    for (const [method, path] of [
      ["GET", "/api/app/feed"],
      ["GET", "/api/missions"],
      ["POST", "/api/missions/abc/start"],
      ["GET", "/api/users/points/stats"],
      ["GET", "/api/users/achievements"],
      ["GET", "/api/dashboard"],
      ["GET", "/api/users/dashboard"],
    ]) {
      const { status, body } = await call(method, path);
      assert.equal(status, 410, `${method} ${path}`);
      assert.equal(body.code, "ENDPOINT_DORMANT");
      assert.equal(body.revivable, true);
    }
  });

  it("목록 밖 경로는 그대로 404", async () => {
    const { status } = await call("GET", "/api/nope");
    assert.equal(status, 404);
  });

  it("유지 경로와 겹치지 않는다 — `/api/users/profile` 은 동면 목록 밖", () => {
    assert.ok(!DORMANT_PATHS.some((p) => "/api/users/profile".startsWith(`${p}/`)));
  });
});
