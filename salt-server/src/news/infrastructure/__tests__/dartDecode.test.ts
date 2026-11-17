import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { dartParagraphs } from "../../domain";
import { decodeDartDocument } from "../DartClient";

/**
 * DART 원문 디코딩(2026-11-17 결함) — 원문은 `charset=euc-kr` 이라 적고 UTF-8 을 보낸다. 선언을 믿으면 한글이 깨지고 숫자만 남았다.
 * 픽스처는 실제 공시 원문(LG 결산실적공시 예고 2026-10-23) 그대로
 */
describe("decodeDartDocument", () => {
  it("UTF-8 바이트 + euc-kr 선언 → UTF-8 로 읽는다(실제 원문)", () => {
    const bytes = readFileSync(join(__dirname, "fixtures", "dart-preview-utf8-declared-euckr.xml"));
    assert.match(bytes.subarray(0, 600).toString("latin1"), /charset=euc-kr/);
    const p = dartParagraphs(decodeDartDocument(bytes));
    assert.ok(p.includes("3. 결산실적 공시예정일"));
    assert.ok(p.includes("2026-11-12"));
    assert.ok(!p.join("").includes("�"));
  });

  it("진짜 EUC-KR 바이트는 선언대로 읽는다", () => {
    const head = Buffer.from('<html><head><meta content="text/html; charset=euc-kr" http-equiv="Content-Type"></head><body><p>', "latin1");
    const ga = Buffer.from([0xb0, 0xa1, 0xb3, 0xaa]); // "가나"
    const tail = Buffer.from("</p></body></html>", "latin1");
    assert.deepEqual(dartParagraphs(decodeDartDocument(Buffer.concat([head, ga, tail]))), ["가나"]);
  });
});
