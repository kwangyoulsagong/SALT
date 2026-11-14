import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type CompanyFact, assembleCompanyBrief, companyFactText, formatFactAmount, isConcernFact } from "..";

/** F017 v4 2d — 회사 사정 칸(SRV-REQ-053 FR-12): 창 · 단 · 걸리는 점 늘 · 공시 먼저 · 숫자 원문 그대로 */

const NOW = new Date("2026-11-14T06:00:00Z"); // KST 15:00
const TODAY = new Date("2026-11-13T15:00:00Z"); // KST 오늘 0시
const day = (n: number) => new Date(NOW.getTime() - n * 86_400_000);
const f = (over: Partial<CompanyFact> = {}): CompanyFact => ({
  who: "차바이오텍", what: "3분기 누적 연결 매출액", amount: "9016", unit: "억원", comparedTo: "전년 동기 대비", whenText: "3분기 누적",
  eventKind: "other", sourceKind: "article", sourceName: "파이낸셜뉴스", sourceUrl: "https://f.example/1",
  publishedAt: day(1), availableAt: day(1), ...over,
});

describe("단 — 창 7 · 90 · 365일", () => {
  const cases: Array<[string, CompanyFact[], string, number | null]> = [
    ["7일 안", [f({ availableAt: day(6.9) })], "now", 7],
    ["8일 전만", [f({ availableAt: day(8) })], "usual", 90],
    ["100일 전만", [f({ availableAt: day(100) })], "longer", 365],
    ["400일 전만", [f({ availableAt: day(400) })], "defect", null],
    ["없음", [], "defect", null],
    ["아직 알 수 없던 사실(미래 available_at)", [f({ availableAt: new Date(NOW.getTime() + 60_000) })], "defect", null],
  ];
  for (const [name, facts, tier, days] of cases) {
    it(name, () => {
      const r = assembleCompanyBrief(facts, [], NOW, TODAY);
      assert.deepEqual([r.tier, r.brief.windowDays], [tier, days]);
    });
  }
  it("창 밖 사실은 칸에 싣지 않는다", () => {
    const r = assembleCompanyBrief([f({ availableAt: day(2) }), f({ what: "옛 영업손실", availableAt: day(50) })], [], NOW, TODAY);
    const all = [r.brief.headline, ...r.brief.earnings, ...r.brief.today, ...r.brief.concern].map((e) => e?.what);
    assert.deepEqual(all, ["3분기 누적 연결 매출액"]);
  });
});

describe("칸", () => {
  it("걸리는 점은 좋은 사실이 많아도 늘 싣는다", () => {
    const good = Array.from({ length: 5 }, (_, i) => f({ what: `신규 수주 ${i}`, amount: null, unit: null, eventKind: "contract" }));
    const r = assembleCompanyBrief([...good, f({ what: "과징금 부과", amount: null, unit: null, eventKind: "legal", availableAt: day(5) })], [], NOW, TODAY);
    assert.deepEqual(r.brief.concern.map((c) => c.what), ["과징금 부과"]);
  });
  it("걸리는 점 낱말 — 감소 · 적자 · 순유출 / 종류 — 소송 · 증자", () => {
    assert.equal(isConcernFact({ eventKind: "other", what: "영업손실", comparedTo: null }), true);
    assert.equal(isConcernFact({ eventKind: "other", what: "매출", comparedTo: "전년 동기 대비 2% 감소" }), true);
    assert.equal(isConcernFact({ eventKind: "rights_offering", what: "신주 발행", comparedTo: null }), true);
    assert.equal(isConcernFact({ eventKind: "earnings", what: "영업이익 증가", comparedTo: null }), false);
  });
  it("공시가 기사보다 앞 · 숫자 있는 사실이 앞", () => {
    const r = assembleCompanyBrief(
      [f({ what: "영업이익", amount: null, unit: null }), f({ what: "매출액", sourceKind: "disclosure", sourceName: "DART", amount: "100", unit: "억원" })],
      [], NOW, TODAY,
    );
    assert.equal(r.brief.headline?.source.kind, "disclosure");
    assert.equal(r.brief.headline?.what, "매출액");
    assert.deepEqual(r.brief.earnings.map((e) => e.what), ["영업이익"]);
  });
  it("오늘 칸 = 게시 시각이 KST 오늘 — 오늘 받은 어제 기사는 아니다", () => {
    const r = assembleCompanyBrief(
      [
        f({ what: "주총 소집", amount: null, unit: null, publishedAt: new Date(TODAY.getTime() + 1), availableAt: new Date(TODAY.getTime() + 60_000) }),
        f({ what: "대표이사 선임", amount: null, unit: null, publishedAt: new Date(TODAY.getTime() + 2), availableAt: new Date(TODAY.getTime() + 120_000) }),
        f({ what: "어제 발표", amount: null, unit: null, publishedAt: new Date(TODAY.getTime() - 1), availableAt: new Date(TODAY.getTime() + 3_600_000) }),
      ],
      [], NOW, TODAY,
    );
    // 한 줄(가장 최근 · 순위 앞)은 오늘 칸에 다시 싣지 않는다
    assert.equal(r.brief.headline?.what, "어제 발표");
    assert.deepEqual(r.brief.today.map((t) => t.what).sort(), ["대표이사 선임", "주총 소집"]);
  });
  it("오늘 받은 어제 기사 둘 — 오늘 칸은 비어 있다", () => {
    const late = { publishedAt: new Date(TODAY.getTime() - 3_600_000), availableAt: new Date(TODAY.getTime() + 3_600_000) };
    const r = assembleCompanyBrief([f({ ...late }), f({ what: "대표이사 선임", amount: null, unit: null, ...late })], [], NOW, TODAY);
    assert.deepEqual(r.brief.today, []);
  });
  it("숫자가 둘 다 있으면 공시가 더 최근 기사보다 앞", () => {
    const r = assembleCompanyBrief(
      [
        f({ what: "매출액", sourceKind: "disclosure", amount: "100", availableAt: day(5) }),
        f({ what: "영업이익", amount: "52", availableAt: day(3) }),
        f({ what: "신규 공장 준공", amount: null, unit: null, comparedTo: null, availableAt: day(1) }),
      ],
      [], NOW, TODAY,
    );
    assert.equal(r.brief.headline?.what, "신규 공장 준공");
    assert.deepEqual(r.brief.earnings.map((e) => e.what), ["매출액", "영업이익"]);
  });

  it("한 사실은 한 칸 — 걸리는 점이 먼저, 실적 · 오늘은 겹치지 않는다(실측 결함 2026-11-14)", () => {
    const today = { publishedAt: new Date(TODAY.getTime() + 1), availableAt: new Date(TODAY.getTime() + 2) };
    const r = assembleCompanyBrief(
      [
        f({ what: "3분기 매출액", comparedTo: "전년 동기 대비 2% 감소", ...today }),
        f({ what: "3분기 영업손실", amount: "831", ...today }),
        f({ what: "3분기 순이익", amount: "52", comparedTo: null, ...today }),
        f({ what: "신규 공장 준공", amount: null, unit: null, comparedTo: null, ...today }),
      ],
      [], NOW, TODAY,
    );
    const cells = [...r.brief.earnings, ...r.brief.today].map((x) => x.what);
    assert.equal(new Set(cells).size, cells.length);
    assert.ok(!cells.includes(r.brief.headline!.what));
    for (const c of r.brief.concern) assert.ok(!cells.includes(c.what), c.what);
    assert.deepEqual(r.brief.concern.map((c) => c.what).sort(), ["3분기 매출액", "3분기 영업손실"]);
  });
  it("같은 사실이 기사 여럿에 — 한 번", () => {
    const r = assembleCompanyBrief([f({ sourceUrl: "https://a" }), f({ sourceUrl: "https://b", sourceName: "다른 매체" })], [], NOW, TODAY);
    assert.deepEqual([r.brief.headline?.source.url, r.brief.earnings.length, r.brief.factCount], ["https://a", 0, 1]);
  });
  it("칸마다 최대 3", () => {
    const many = Array.from({ length: 6 }, (_, i) => f({ what: `${i}분기 영업손실`, amount: null, unit: null }));
    const r = assembleCompanyBrief(many, [], NOW, TODAY);
    assert.deepEqual([r.brief.earnings.length, r.brief.concern.length, r.brief.factCount], [3, 3, 6]);
  });
  it("업계 줄은 원인 칸 근거 그대로 · 사실이 없어도 싣는다", () => {
    const r = assembleCompanyBrief([], [{ text: "제약 지수 +1.2%", source: "업종 지수", at: null }], NOW, TODAY);
    assert.deepEqual(r.brief.sector.map((s) => s.text), ["제약 지수 +1.2%"]);
  });
});

describe("한 줄 · 숫자 표기", () => {
  it("숫자는 원문 값 그대로 · 세 자리 쉼표만", () => {
    assert.equal(formatFactAmount("9016"), "9,016");
    assert.equal(formatFactAmount("1234567.5"), "1,234,567.5");
    assert.equal(formatFactAmount("-3.2"), "-3.2");
  });
  it("누가 무엇 숫자단위 (비교) — 무엇이 누가로 시작하면 누가를 겹치지 않는다", () => {
    assert.equal(companyFactText(f()), "차바이오텍 3분기 누적 연결 매출액 9,016억원 (전년 동기 대비)");
    assert.equal(companyFactText(f({ who: "BGF", what: "BGF휴먼넷 대표 선임", amount: null, unit: null, comparedTo: null })), "BGF휴먼넷 대표 선임");
    assert.equal(companyFactText(f({ what: "차바이오텍 흑자전환", amount: null, unit: null, comparedTo: null })), "차바이오텍 흑자전환");
  });
});
