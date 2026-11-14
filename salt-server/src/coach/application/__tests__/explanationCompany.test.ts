import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type CoachExplanationInput, type CompanyFact, explanationFactCatalog } from "../../domain";
import { withCompany } from "../lib/explanationGeneration";
import type { PreparedExplanation } from "../lib/explanationMaterials";

/** F017 v4 2b+ FR-16 — 회사 사정이 해설 재료로: 패널과 같은 조립 · 걸리는 점 표시 · 숫자 인용 출처 · 실패면 없이 */

const NOW = new Date("2026-11-14T06:00:00Z");
const input: CoachExplanationInput = {
  symbol: "085660", koreanName: "차바이오텍", mode: "long_term", currentPrice: 10_000, change24h: 1, tradeValue24h: 1e10,
  evidence: [{ label: "근거", value: "RSI 45" }],
};
const prepared = { symbol: "085660", view: { assetClass: "kr_stock" }, input } as unknown as PreparedExplanation;
const fact = (over: Partial<CompanyFact>): CompanyFact => ({
  who: "차바이오텍", what: "3분기 누적 연결 매출액", amount: "9016", unit: "억원", comparedTo: "전년 동기 대비 2% 감소", whenText: null,
  eventKind: "earnings", sourceKind: "article", sourceName: "파이낸셜뉴스", sourceUrl: "https://f/1",
  publishedAt: new Date(NOW.getTime() - 86_400_000), availableAt: new Date(NOW.getTime() - 86_400_000), ...over,
});
const company = (facts: CompanyFact[], filings: CompanyFact[] = []) => ({ facts: { recent: async () => facts }, filings: { recent: async () => filings } });

describe("withCompany", () => {
  it("한 줄 · 걸리는 점 · 실적 — 최대 3줄 · 걸리는 점 표시", async () => {
    const r = await withCompany(
      company([
        fact({}),
        fact({ what: "3분기 누적 영업손실", amount: "831", comparedTo: null, sourceUrl: "https://f/2" }),
        fact({ what: "3분기 순이익", amount: null, unit: null, comparedTo: null, sourceUrl: "https://f/3" }),
        fact({ what: "신규 공장 준공", amount: null, unit: null, comparedTo: null, eventKind: "other", sourceUrl: "https://f/4" }),
      ]),
      prepared, input, NOW,
    );
    assert.equal(r.company?.lines.length, 3);
    assert.ok(r.company?.lines.some((l) => l.concern && l.text.includes("영업손실")));
  });
  it("사실이 많아도 3줄", async () => {
    const many = Array.from({ length: 8 }, (_, i) => fact({ what: `${i}분기 영업손실`, amount: null, unit: null, comparedTo: null, sourceUrl: `https://f/m${i}` }));
    assert.equal((await withCompany(company(many), prepared, input, NOW)).company?.lines.length, 3);
  });
  it("공시 목록만 있어도 싣는다", async () => {
    const r = await withCompany(company([], [fact({ what: "현금ㆍ현물배당결정", amount: null, unit: null, comparedTo: null, sourceKind: "disclosure", sourceName: "DART 공시", eventKind: "dividend" })]), prepared, input, NOW);
    assert.deepEqual(r.company?.lines.map((l) => l.source), ["DART 공시"]);
  });
  it("사실 없음 · 읽기 실패 → 회사 사정 없이(입력 그대로)", async () => {
    assert.equal((await withCompany(company([]), prepared, input, NOW)).company, undefined);
    const broken = { facts: { recent: async () => { throw new Error("down"); } }, filings: { recent: async () => [] } };
    assert.equal(await withCompany(broken, prepared, input, NOW), input);
    assert.equal(await withCompany(undefined, prepared, input, NOW), input);
  });
});

describe("인용", () => {
  const withC: CoachExplanationInput = { ...input, company: { lines: [{ text: "차바이오텍 3분기 누적 연결 영업손실 831억원", source: "파이낸셜뉴스", concern: true }] } };
  it("문장이 회사 사정 숫자를 말하면 그 출처 이름으로 인용할 수 있다", () => {
    const refs = explanationFactCatalog(withC, NOW);
    const c = refs.find((r) => r.id === "company-1");
    assert.equal(c?.label, "파이낸셜뉴스");
    // "831억원" 은 원 단위 값으로 읽힌다(numericTokens)
    assert.ok(c?.numbers.some((n) => n.value === 831e8 && n.unit === "krw"), JSON.stringify(c?.numbers));
  });
});

describe("인용 — 회사 사정을 말만 바꿔 옮긴 문장(실측 결함 2026-11-14)", async () => {
  const { citeSentence } = await import("../../domain");
  const withIr: CoachExplanationInput = { ...input, company: { lines: [{ text: "포스코퓨처엠 기업설명회(IR) 개최 안내공시", source: "DART 공시", concern: false }] } };
  it("숫자 없이 옮겨도 그 출처 이름으로", () => {
    const cites = citeSentence("risks", "기업설명회(IR) 개최 안내공시처럼 예정된 일정 전후로 평소 범위를 벗어나면 전제가 약해질 수 있어요.", explanationFactCatalog(withIr, NOW));
    assert.ok(cites.some((c) => c.label === "DART 공시"), JSON.stringify(cites));
  });
  it("겹치지 않는 문장은 회사 사정으로 인용하지 않는다", () => {
    const cites = citeSentence("risks", "손절 기준이 없는 진입은 손실 폭을 미리 정하지 못해요.", explanationFactCatalog(withIr, NOW));
    assert.ok(!cites.some((c) => c.label === "DART 공시"));
  });
});
