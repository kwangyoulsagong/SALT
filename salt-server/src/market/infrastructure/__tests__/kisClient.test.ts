import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, it } from "node:test";

import { KIS_QUERY_TR, assertQueryTr, maskKisSecrets } from "../KisClient";
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
