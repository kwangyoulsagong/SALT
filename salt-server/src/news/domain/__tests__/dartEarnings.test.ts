import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { classifyEarningsFiling, parseIrSchedule, parsePreviewSchedule, periodEndFromName, periodFromText } from "../DartEarnings";

/**
 * F008 슬라이스 24 2단계 — 실적 공시 분류 · IR · 예고 본문 일정. 본문은 실제 공시 원문을 `dartParagraphs` 로 바꾼 것
 * (삼성전자 · 하나금융 · SK하이닉스 정정 · 현대차 IR, LG · 한전 예고 — 2026-10 ~ 11)
 */

const docs = JSON.parse(readFileSync(join(__dirname, "fixtures", "dartEarningsDocs.json"), "utf8")) as Record<string, string[]>;
const doc = (name: string): string[] => {
  const d = docs[name];
  if (!d) throw new Error(`fixture ${name}`);
  return d;
};

describe("classifyEarningsFiling — 경계 표(dart_filing 1년 실측 이름)", () => {
  const cases: Array<[string, ReturnType<typeof classifyEarningsFiling>]> = [
    ["연결재무제표기준영업(잠정)실적(공정공시)", "earnings"],
    ["영업(잠정)실적(공정공시)", "earnings"],
    ["매출액또는손익구조30%(대규모법인은15%)이상변경", "earnings"],
    ["분기보고서 (2026.09)", "earnings"],
    ["반기보고서 (2026.06)", "earnings"],
    ["사업보고서 (2025.12)", "earnings"],
    ["기업설명회(IR)개최(안내공시)", "ir"],
    ["[기재정정]기업설명회(IR)개최(안내공시)", "ir"],
    ["결산실적공시예고(안내공시)", "preview"],
    // 아님 — 정정(처음 공시가 이미 있다) · 자회사 실적 · 전망 · 해외 신고 · 그 밖
    ["[기재정정]연결재무제표기준영업(잠정)실적(공정공시)", null],
    ["[첨부추가]연결재무제표기준영업(잠정)실적(공정공시)", null],
    ["[기재정정]분기보고서 (2026.09)", null],
    ["연결재무제표기준영업(잠정)실적(공정공시)(자회사의 주요경영사항)", null],
    ["기업설명회(IR)개최(안내공시)(자회사의 주요경영사항)", null],
    ["연결재무제표기준영업실적등에대한전망(공정공시)", null],
    ["해외증권거래소등에신고한사업보고서등의국내신고", null],
    ["매출액또는손익구조30%(대규모법인15%)미만변경(자율공시)", "earnings"],
    ["단일판매ㆍ공급계약체결", null],
    ["현금ㆍ현물배당결정", null],
  ];
  for (const [name, want] of cases) it(`${name} → ${want}`, () => assert.equal(classifyEarningsFiling(name), want));
});

describe("periodEndFromName", () => {
  it("결산 월 → 그 달 끝날(윤년 2월 포함)", () => {
    assert.equal(periodEndFromName("분기보고서 (2026.09)"), "2026-09-30");
    assert.equal(periodEndFromName("반기보고서 (2024.06)"), "2024-06-30");
    assert.equal(periodEndFromName("사업보고서 (2025.12)"), "2025-12-31");
    assert.equal(periodEndFromName("사업보고서 (2024.02)"), "2024-02-29");
  });
  it("이름에 결산 월이 없거나 틀리면 null", () => {
    assert.equal(periodEndFromName("영업(잠정)실적(공정공시)"), null);
    assert.equal(periodEndFromName("분기보고서 (2026.13)"), null);
  });
});

describe("parseIrSchedule — 실제 원문", () => {
  it("실적 IR(삼성전자 3분기 컨퍼런스콜) — 시각 KST · 실적", () => {
    assert.deepEqual(parseIrSchedule(doc("irSamsungEarnings")), {
      scheduledAt: new Date("2026-10-29T01:00:00Z"), timeKnown: true, aboutEarnings: true, periodEnd: "2026-09-30",
    });
  });
  it("현대차 '경영실적발표'(띄어쓰기 없음)도 실적", () => {
    const s = parseIrSchedule(doc("irHyundaiEarnings"));
    assert.equal(s?.aboutEarnings, true);
    assert.equal(s?.scheduledAt.toISOString(), "2026-10-29T05:10:00.000Z");
  });
  it("NDR('주요 경영실적 및 관심사') · 포럼은 실적 발표가 아니다 · 시각 '--:--' 는 모름 → 그날 09:00 KST", () => {
    const hana = parseIrSchedule(doc("irHanaNdr"));
    assert.deepEqual(hana, { scheduledAt: new Date("2026-11-18T00:00:00Z"), timeKnown: false, aboutEarnings: false, periodEnd: null });
    assert.equal(parseIrSchedule(doc("irSamsungForum"))?.aboutEarnings, false);
  });
  it("정정 공시는 정정 표 뒤 마지막 양식을 읽는다", () => {
    const s = parseIrSchedule(doc("irHynixAmended"));
    assert.equal(s?.scheduledAt.toISOString(), "2026-10-28T00:00:00.000Z");
    assert.equal(s?.aboutEarnings, true);
  });
  it("코스닥 양식(머리 줄 뒤 값 · '실시목적' · '주요내용') — 첫 날짜 · 시작 시각, 합병 간담회는 실적 아님", () => {
    assert.deepEqual(parseIrSchedule(doc("irAlteogenKosdaq")), {
      scheduledAt: new Date("2026-10-15T05:00:00Z"), timeKnown: true, aboutEarnings: false, periodEnd: null,
    });
    // 이틀 행사(시작일 · 종료일 · 시작 · 종료 시각) — 시작일 · 시작 시각
    assert.equal(parseIrSchedule(doc("irAlteogenKosdaqTwoDays"))?.scheduledAt.toISOString(), "2026-09-21T00:30:00.000Z");
  });
  it("코스닥 실적 IR — '4. 실시목적' 칸이 실적 발표면 실적", () => {
    const lines = ["1. 일시", "행사일", "시작일", "시작시간", "2026-11-05", "16:00", "2. 장소", "-", "4. 실시목적", "2026년 3분기 실적 발표", "5. 실시방법"];
    assert.equal(parseIrSchedule(lines)?.aboutEarnings, true);
    assert.equal(parseIrSchedule(lines)?.periodEnd, "2026-09-30");
  });
  it("실적 뒤 콘퍼런스 — 내용 칸에만 실적이 있으면 실적 IR 이 아니다(기아 CLSA · 신한 MS 표본)", () => {
    const lines = ["1. 일시 및 장소", "일시", "2026-09-10", "09:00", "3. 개최목적", "CITIC CLSA Investors' Forum 참석", "4. 개최방법", "1:1",
      "6. 주요 설명회내용(요약)", "'26년 2분기 경영실적 및 주요 경영현황 설명", "7. 결정일자"];
    assert.deepEqual([parseIrSchedule(lines)?.aboutEarnings, parseIrSchedule(lines)?.periodEnd], [false, null]);
  });
  it("일시 칸이 없거나 날짜가 아니면 null", () => {
    assert.equal(parseIrSchedule(["기업설명회(IR) 개최(안내공시)", "2. 참가 대상자"]), null);
    assert.equal(parseIrSchedule(["1. 일시 및 장소", "일시", "미정", "장소"]), null);
  });
});

describe("parsePreviewSchedule — 실제 원문", () => {
  it("LG · 한전 — 예정일 · 결산 기간 끝 · 늘 실적", () => {
    for (const name of ["previewLg", "previewKepco"]) {
      assert.deepEqual(parsePreviewSchedule(doc(name)), {
        scheduledAt: new Date("2026-11-12T00:00:00Z"), timeKnown: false, aboutEarnings: true, periodEnd: "2026-09-30",
      });
    }
  });
  it("4번 칸 문장의 '공시예정일은 …'을 칸 제목으로 잡지 않는다(한전 실측)", () => {
    const lines = ["3. 결산실적 공시예정일", "2026-11-12", "4. 기타", "- 공시예정일은 당사", "사정에 의해 변경될 수 있습니다."];
    assert.equal(parsePreviewSchedule(lines)?.scheduledAt.toISOString(), "2026-11-12T00:00:00.000Z");
  });
  it("예정일 칸이 없으면 null", () => assert.equal(parsePreviewSchedule(["결산실적공시 예고(안내공시)"]), null));
});

describe("periodFromText — 목적 글의 결산", () => {
  const cases: Array<[string, string | null]> = [
    ["2026년 3분기 경영실적 발표", "2026-09-30"],
    ["'26년 2분기 경영실적 발표", "2026-06-30"],
    ["2025년 4분기 및 연간 경영실적 발표", "2025-12-31"],
    ["2026년 상반기 실적 설명회", "2026-06-30"],
    ["2025년 연간 실적 발표", "2025-12-31"],
    ["2025년 결산 실적 발표", "2025-12-31"],
    ["분기 경영실적 발표", null],
    ["실적 발표", null],
  ];
  for (const [text, want] of cases) it(`${text} → ${want}`, () => assert.equal(periodFromText(text), want));
});
