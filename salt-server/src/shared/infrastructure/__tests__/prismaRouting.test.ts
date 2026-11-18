import assert from "node:assert/strict";
import { describe, it } from "node:test";

import cron from "node-cron";

import { inBatchContext, routedClient, runAsBatch } from "../prisma";

/**
 * 연결 풀 나누기(2026-11-17 재기동 뒤 504) — 워커 맥락은 배치 풀, 화면 요청은 화면 풀. 맥락은 타이머 · cron 회차로 물려 간다
 */
const fake = (name: string) => ({
  name,
  user: { findMany: async () => name },
  $queryRaw: async function (this: { name: string }) {
    return this.name;
  },
});

describe("routedClient", () => {
  const http = fake("http");
  const batch = fake("batch");
  const prisma = routedClient(http, batch, inBatchContext);

  it("맥락 밖(화면 요청)은 화면 풀", async () => {
    assert.equal(await prisma.user.findMany(), "http");
    assert.equal(await prisma.$queryRaw(), "http");
  });

  it("배치 맥락 안은 배치 풀 — 함수는 고른 클라이언트에 묶인다", async () => {
    await runAsBatch(async () => {
      assert.equal(await prisma.user.findMany(), "batch");
      assert.equal(await prisma.$queryRaw(), "batch");
    });
  });

  it("배치 맥락에서 등록한 타이머 · 나중 회차도 배치 풀(cron 이 이 길) — 밖에서 등록한 것은 화면 풀", async () => {
    const seen: string[] = [];
    await new Promise<void>((done) => {
      runAsBatch(() => {
        setTimeout(async () => {
          seen.push(await prisma.user.findMany());
          done();
        }, 5);
      });
    });
    await new Promise<void>((done) => setTimeout(async () => (seen.push(await prisma.user.findMany()), done()), 5));
    assert.deepEqual(seen, ["batch", "http"]);
  });

  it("배치 맥락은 새는 일이 없다 — 끝나면 다시 화면 풀", async () => {
    await runAsBatch(async () => undefined);
    assert.equal(inBatchContext(), false);
    assert.equal(await prisma.user.findMany(), "http");
  });

  it("진짜 node-cron — 배치 맥락에서 등록한 회차는 두 번째 회차까지 배치 맥락(라이브러리 타이머 사슬이 맥락을 잇는다)", async () => {
    const seen: boolean[] = [];
    let task: { stop: () => unknown } | undefined;
    await new Promise<void>((done) => {
      runAsBatch(() => {
        task = cron.schedule("* * * * * *", () => {
          seen.push(inBatchContext());
          if (seen.length >= 2) done();
        });
      });
    });
    task?.stop();
    assert.deepEqual(seen.slice(0, 2), [true, true]);
  });
});

describe("routedClient — 열린 트랜잭션(원장 쓰기 · F006 G절 2단계)", () => {
  it("트랜잭션이 열려 있으면 화면 · 배치 맥락보다 그 클라이언트가 먼저 — 저장소 코드는 그대로", async () => {
    let active: object | undefined;
    const tx = fake("tx");
    const prisma = routedClient(fake("http"), fake("batch"), inBatchContext, () => active);
    assert.equal(await prisma.user.findMany(), "http");
    active = tx;
    assert.equal(await prisma.user.findMany(), "tx");
    assert.equal(await runAsBatch(() => prisma.$queryRaw()), "tx");
    active = undefined;
    assert.equal(await runAsBatch(() => prisma.user.findMany()), "batch");
  });
});
