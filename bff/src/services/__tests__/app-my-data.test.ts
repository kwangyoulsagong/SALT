import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it, mock } from "node:test";

import { appMyDataService, MY_DATA_SERVICES, toCsv, toServiceExport } from "../app-my-data.service";
import { backendApi } from "../backend-api.service";
import { zip } from "../../utils/zip.util";

/**
 * 내 데이터(`BFF-REQ-046` FR-7 · 서버 S3c). 불변식 셋
 * 1. 내보내기는 **전부 아니면 실패** — 일부만 담긴 zip 을 내주지 않는다
 * 2. 삭제는 **비밀번호 허가 → 서비스 순서 → 계정 마지막** · 중간 실패면 거기서 멈춘다(계정이 남아 다시 누를 수 있다)
 * 3. 서버 4xx(401 · 403 비밀번호 틀림)는 그대로 올린다
 */
const axiosError = (status: number, code?: string) =>
  Object.assign(new Error(`upstream ${status}`), { isAxiosError: true, response: { status, data: { success: false, code, message: "x" }, headers: {} } });

const exportOf = (service: string) => ({ data: { data: { service, tables: [{ name: "t", columns: ["id", "memo"], rows: [["1", "a,\"b\"\n줄"]] }] } } });

describe("내 데이터 — 내보내기", () => {
  afterEach(() => mock.restoreAll());

  it("서비스 여덟 곳(identity + 일곱)을 읽어 zip — README · all.json · 서비스/표.csv · zip 이 실제로 풀린다", async () => {
    const seen: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string) => {
      seen.push(`${m} ${url}`);
      return exportOf(url.split("/")[1]) as never;
    });
    const { fileName, body } = await appMyDataService.exportZip("t", new Date("2026-11-12T05:00:00Z"));
    assert.equal(fileName, "salt-my-data-2026-11-12.zip");
    assert.deepEqual(seen.sort(), ["GET /identity/me/data", ...MY_DATA_SERVICES.map((s) => `GET ${s.path}`)].sort());
    const dir = mkdtempSync(join(tmpdir(), "mydata-"));
    writeFileSync(join(dir, "x.zip"), body);
    execFileSync("unzip", ["-tq", join(dir, "x.zip")]);
    execFileSync("unzip", ["-q", join(dir, "x.zip"), "-d", join(dir, "out")]);
    assert.match(readFileSync(join(dir, "out", "README.txt"), "utf8"), /비밀번호/);
    assert.equal(JSON.parse(readFileSync(join(dir, "out", "all.json"), "utf8")).services.length, 8);
    assert.equal(readFileSync(join(dir, "out", "savings", "t.csv"), "utf8"), '﻿id,memo\r\n1,"a,""b""\n줄"\r\n');
  });

  it("하나라도 5xx · 시간 초과 · 모양이 틀리면 502 EXPORT_INCOMPLETE — 일부만 담지 않는다", async () => {
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      if (url.startsWith("/household")) throw axiosError(500);
      return exportOf("x") as never;
    });
    await assert.rejects(appMyDataService.exportZip("t"), (e: { statusCode?: number; code?: string }) => e.statusCode === 502 && e.code === "EXPORT_INCOMPLETE");
    mock.restoreAll();
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) =>
      (url.startsWith("/savings") ? { data: { data: { service: "savings", tables: [{ name: "t", columns: ["a"], rows: [[1]] }] } } } : exportOf("x")) as never,
    );
    await assert.rejects(appMyDataService.exportZip("t"), (e: { code?: string }) => e.code === "EXPORT_INCOMPLETE");
  });

  it("401 이 하나라도 있으면 그 401 을 그대로(다른 곳의 5xx 보다 먼저)", async () => {
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      if (url.startsWith("/household")) throw axiosError(500);
      if (url.startsWith("/savings")) throw axiosError(401);
      return exportOf("x") as never;
    });
    await assert.rejects(appMyDataService.exportZip("t"), (e: { response?: { status?: number } }) => e.response?.status === 401);
  });

  it("모양 검사 · CSV — null 은 빈 칸 · 칸 수가 다르면 못 읽음", () => {
    assert.equal(toServiceExport({ service: "s", tables: [{ name: "t", columns: ["a", "b"], rows: [["1"]] }] }), null);
    assert.equal(toServiceExport({ tables: [] }), null);
    assert.equal(toCsv({ name: "t", columns: ["a", "b"], rows: [[null, "x"]] }), "﻿a,b\r\n,x\r\n");
  });

  it("zip — 파일 하나도 올바른 파일(이름은 서비스 · 표 영문뿐 — 내보내기엔 README 가 늘 있어 빈 zip 은 없다)", () => {
    const dir = mkdtempSync(join(tmpdir(), "mydata-"));
    writeFileSync(join(dir, "one.zip"), zip([{ name: "a/b.csv", content: "가" }]));
    assert.match(execFileSync("unzip", ["-l", join(dir, "one.zip")]).toString(), /a\/b\.csv/);
  });
});

describe("내 데이터 — 계정 삭제", () => {
  afterEach(() => mock.restoreAll());

  it("허가 → 서비스 순서대로(허가 머리 · 본문 없음) → 계정 마지막(행 수를 싣는다)", async () => {
    const calls: Array<{ m: string; url: string; data: unknown; headers?: Record<string, string> }> = [];
    mock.method(backendApi, "proxyAuthRequest", async (m: string, url: string, _t: string, data: unknown, opts: { headers?: Record<string, string> }) => {
      calls.push({ m, url, data, headers: opts?.headers });
      if (url === "/identity/me/erase-grant") return { data: { data: { eraseToken: "g", expiresIn: 300 } } } as never;
      return { data: { data: { deleted: { rows: 2 } } } } as never;
    });
    const result = await appMyDataService.deleteAccount("t", "pw");
    assert.deepEqual(
      calls.map((c) => `${c.m} ${c.url}`),
      ["POST /identity/me/erase-grant", ...MY_DATA_SERVICES.map((s) => `DELETE ${s.path}`), "DELETE /identity/me"],
    );
    assert.deepEqual(calls[0].data, { password: "pw" });
    assert.ok(calls.slice(1).every((c) => c.headers?.["X-Salt-Erase"] === "g"));
    const last = calls.at(-1)!.data as { deleted: Record<string, unknown> };
    assert.deepEqual(Object.keys(last.deleted), MY_DATA_SERVICES.map((s) => s.service));
    assert.deepEqual(result.deleted.identity, { rows: 2 });
    assert.equal(result.total, 2 * (MY_DATA_SERVICES.length + 1));
  });

  it("비밀번호 틀림 403 은 그대로 · 아무것도 안 지운다 · 빈 비밀번호는 400", async () => {
    const calls: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      calls.push(url);
      throw axiosError(403, "REAUTH_FAILED");
    });
    await assert.rejects(appMyDataService.deleteAccount("t", "x"), (e: { response?: { status?: number } }) => e.response?.status === 403);
    assert.deepEqual(calls, ["/identity/me/erase-grant"]);
    await assert.rejects(appMyDataService.deleteAccount("t", ""), (e: { statusCode?: number; code?: string }) => e.statusCode === 400 && e.code === "PASSWORD_REQUIRED");
  });

  it("중간 서비스 5xx 면 거기서 멈춘다 — 뒤 서비스 · 계정은 부르지 않는다(502 ACCOUNT_DELETE_INCOMPLETE)", async () => {
    const calls: string[] = [];
    mock.method(backendApi, "proxyAuthRequest", async (_m: string, url: string) => {
      calls.push(url);
      if (url === "/identity/me/erase-grant") return { data: { data: { eraseToken: "g" } } } as never;
      if (url === "/savings/me/data") throw axiosError(503);
      return { data: { data: { deleted: {} } } } as never;
    });
    await assert.rejects(appMyDataService.deleteAccount("t", "pw"), (e: { statusCode?: number; code?: string }) => e.statusCode === 502 && e.code === "ACCOUNT_DELETE_INCOMPLETE");
    assert.equal(calls.at(-1), "/savings/me/data");
    assert.ok(!calls.includes("/identity/me"));
  });
});
