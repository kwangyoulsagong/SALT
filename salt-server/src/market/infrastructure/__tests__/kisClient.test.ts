import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { KIS_QUERY_TR, KisClient, assertQueryTr, maskKisSecrets } from "../KisClient";
import { parseMasterFile } from "../KisMasterFile";

describe("KIS 조회 TR 허용 목록 — 주문 · 계좌 경로 0건 (F011 FR-3 · 공통 수용 기준 2)", () => {
  it("우리가 부르는 TR 은 전부 허용 목록 규칙을 통과한다", () => {
    for (const trId of Object.values(KIS_QUERY_TR)) assert.doesNotThrow(() => assertQueryTr(trId));
  });

  it("주문(U 로 끝남) · 계좌 · 체결통보 TR 은 거부된다", () => {
    for (const trId of ["TTTC0012U", "TTTC0011U", "TTTC0013U", "TTTC8434R", "TTTC8908R", "VTTC0012U", "H0STCNI0", "H0STCNI9", "FHKST0101010U"]) {
      assert.throws(() => assertQueryTr(trId), /허용 목록 밖/, trId);
    }
  });

  it("레포 전체(테스트 · 문서 제외) 서버 · BFF · 프론트 · 예측 소스에 주문 · 계좌 TR 문자열이 0건이다", () => {
    const root = resolve(__dirname, "../../../../..");
    let hits = "";
    try {
      hits = execFileSync(
        "git",
        ["-C", root, "grep", "-nE", "\\b(TTTC|VTTC|TTTS|VTTS|CTSC)[0-9A-Z]{4,6}\\b", "--", "salt-server/src", "bff/src", "salt-microFe/apps", "salt-microFe/packages", "salt-forecast/src", ":!**/__tests__/**"],
        { encoding: "utf8" }
      );
    } catch (error) {
      // git grep 은 일치가 없으면 1 로 끝난다 — 그게 통과다
      if ((error as { status?: number }).status !== 1) throw error;
    }
    assert.equal(hits.trim(), "");
  });
});

describe("비밀값 마스킹 (FR-5)", () => {
  it("Bearer 토큰 · 앱 키 · 시크릿을 지운다", () => {
    const text = "fail appkey=PSabcdef123 secret=ZZsecretZZ authorization: Bearer eyJ.abc.def";
    const masked = maskKisSecrets(text, ["PSabcdef123", "ZZsecretZZ"]);
    assert.ok(!masked.includes("PSabcdef123"));
    assert.ok(!masked.includes("ZZsecretZZ"));
    assert.ok(!masked.includes("eyJ.abc.def"));
  });
});

describe("종목 마스터 고정폭 파서 (FR-10)", () => {
  it("KOSPI 한 줄 — 앞(코드 · 표준코드 · cp949 이름) + 뒤 227바이트", () => {
    const fields: string[] = [];
    const specs = [2, 1, 4, 4, 4, ...Array(26).fill(1), 9, 5, 5, 1, 1, 1, 2, 1, 1, 1, 2, 2, 2, 3, 1, 3, 12, 12, 8, 15, 21, 2, 7, 1, 1, 1, 1, 1, 9, 9, 9, 5, 9, 8, 9, 3, 1, 1, 1];
    const values: Record<number, string> = { 0: "ST", 2: "0027", 22: "0", 31: "000272000", 34: "N", 36: "N", 37: "00", 49: "19750611", 50: "000000005846278", 54: "0", 65: "015901877" };
    specs.forEach((w, i) => fields.push((values[i] ?? "").padEnd(w, " ").slice(0, w)));
    const tail = fields.join("");
    assert.equal(tail.length, 227);
    const head = Buffer.concat([Buffer.from("005930   KR7005930003"), Buffer.from([0xbb, 0xef, 0xbc, 0xba, 0xc0, 0xfc, 0xc0, 0xda]), Buffer.from("   ")]);
    const [row] = parseMasterFile("KOSPI", Buffer.concat([head, Buffer.from(tail, "latin1"), Buffer.from("\n")]));
    assert.equal(row.code, "005930");
    assert.equal(row.name, "삼성전자");
    assert.equal(row.basePrice, 272_000);
    assert.equal(row.sharesOutstanding, 5_846_278_000n);
    assert.equal(row.marketCap, 15_901_877 * 100_000_000);
    assert.equal(row.isHalted, false);
    assert.deepEqual(row.listedAt, new Date("1975-06-11T00:00:00Z"));
  });
});

describe("KIS 상태 · 지표 (FR-92 · 94)", () => {
  // 호출 결과 집계만 본다 — 네트워크 없이 내부 기록 함수를 부른다
  const client = () => new KisClient({ appKey: "k", appSecret: "s", baseUrl: "http://127.0.0.1:9" });
  const rec = (c: KisClient, tr: string, outcome: "ok" | "fail" | "rate") =>
    (c as unknown as { record: (t: string, o: string) => void }).record(tr, outcome);

  it("진짜 실패 5회 연속이면 degraded, 성공 한 번이면 ok 로 돌아온다", () => {
    const c = client();
    for (let i = 0; i < 4; i++) rec(c, "FHKST01010100", "fail");
    assert.equal(c.snapshot().status, "ok");
    rec(c, "FHKST01010100", "fail");
    assert.equal(c.snapshot().status, "degraded");
    assert.ok(c.snapshot().since);
    rec(c, "FHKST01010100", "ok");
    assert.equal(c.snapshot().status, "ok");
    assert.equal(c.snapshot().consecutiveFailures, 0);
  });

  it("초과 응답은 장애로 세지 않는다 — 감속이 처리한다", () => {
    const c = client();
    for (let i = 0; i < 10; i++) rec(c, "FHKST01010100", "rate");
    assert.equal(c.snapshot().status, "ok");
  });

  it("지표는 TR 별로 세고 drain 하면 비워진다", () => {
    const c = client();
    rec(c, "FHKST01010100", "ok");
    rec(c, "FHKST01010100", "rate");
    rec(c, "FHKST03010100", "fail");
    const { byTr } = c.drainMetrics();
    assert.deepEqual(byTr.FHKST01010100, { calls: 2, failures: 0, rateLimited: 1 });
    assert.deepEqual(byTr.FHKST03010100, { calls: 1, failures: 1, rateLimited: 0 });
    assert.deepEqual(c.drainMetrics().byTr, {});
  });
});

