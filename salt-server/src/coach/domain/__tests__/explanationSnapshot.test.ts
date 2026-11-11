import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { CoachExplanationInput } from "../ports";
import {
  citeSentence,
  EXPLANATION_PREVIOUS_MAX_AGE_MS,
  explanationFactCatalog,
  explanationFingerprint,
  explanationSentences,
  isStorableExplanation,
  judgmentOnlySentences,
  llmSentenceCount,
  selectExplanationTier,
  templateExplanation,
  type ExplanationFingerprintInput,
  type JudgmentObservation,
} from "../policy";

/** 해설 스냅샷 규칙 — F017 v2 단계 3 · `SRV-REQ-053` FR-3 */
const NOW = new Date("2026-11-11T06:00:00Z");

const obs = (item: JudgmentObservation["item"], value: number | null, lower = 35, upper = 70): JudgmentObservation => ({
  item,
  value,
  lower,
  upper,
  distance: value === null ? null : 1,
  points: 0,
  missing: value === null,
});

const fpBase: ExplanationFingerprintInput = {
  mode: "scalp",
  action: "wait",
  observations: [obs("rsi", 48), obs("change24h", 1.2, -3, 3)],
  caveatReasons: [],
  newsTitles: ["a", "b", "c"],
};

describe("explanationFingerprint — 판단이 의미 있게 바뀔 때만 바뀐다", () => {
  const fp = explanationFingerprint(fpBase);
  const table: Array<[string, Partial<ExplanationFingerprintInput>, boolean]> = [
    ["RSI 가 문턱 안에서 움직임(48 → 52)", { observations: [obs("rsi", 52), obs("change24h", 1.2, -3, 3)] }, false],
    ["관측 순서만 바뀜", { observations: [obs("change24h", 1.4, -3, 3), obs("rsi", 48)] }, false],
    ["넷째 뉴스만 바뀜", { newsTitles: ["a", "b", "c", "d"] }, false],
    ["RSI 가 문턱 밖으로(48 → 72)", { observations: [obs("rsi", 72), obs("change24h", 1.2, -3, 3)] }, true],
    ["재료가 빠짐", { observations: [obs("rsi", null), obs("change24h", 1.2, -3, 3)] }, true],
    ["행동이 바뀜", { action: "review_entry" }, true],
    ["모드가 다름", { mode: "long_term" }, true],
    ["꼬리표가 붙음", { caveatReasons: ["stale_inputs"] }, true],
    ["맨 위 뉴스가 바뀜", { newsTitles: ["z", "b", "c"] }, true],
  ];
  for (const [name, patch, changes] of table) {
    it(`${name} → ${changes ? "바뀜" : "같음"}`, () => {
      assert.equal(explanationFingerprint({ ...fpBase, ...patch }) !== fp, changes);
    });
  }
});

describe("selectExplanationTier — 4단 경계 표", () => {
  const head = (fingerprint: string, action: string, ageMs: number) => ({
    fingerprint,
    action,
    generatedAt: new Date(NOW.getTime() - ageMs),
  });
  const base = { mode: "scalp" as const, fingerprint: "F", action: "wait" as const, factsAvailable: true, now: NOW };
  const max = EXPLANATION_PREVIOUS_MAX_AGE_MS.scalp;
  const table: Array<[string, Parameters<typeof selectExplanationTier>[0], string]> = [
    ["지문 같음 → 최신", { ...base, stored: head("F", "wait", 3 * max) }, "latest"],
    ["지문 다름 · 같은 방향 · 기간 안 → 이전", { ...base, stored: head("G", "wait", max) }, "previous"],
    ["지문 다름 · 같은 방향 · 기간 밖 → 템플릿", { ...base, stored: head("G", "wait", max + 1) }, "template"],
    ["지문 다름 · 다른 방향 → 템플릿(판단 카드와 다른 말 0)", { ...base, stored: head("G", "review_entry", 1) }, "template"],
    ["저장본 없음 → 템플릿", { ...base, stored: null }, "template"],
    ["저장본 없음 · 사실 없음 → 없음", { ...base, stored: null, factsAvailable: false }, "none"],
    ["사실이 없어도 같은 방향 이전 해설은 보인다", { ...base, stored: head("G", "wait", 1), factsAvailable: false }, "previous"],
    ["장기는 30일까지 이전", { ...base, mode: "long_term", stored: head("G", "wait", 29 * 86_400_000) }, "previous"],
  ];
  for (const [name, input, tier] of table) {
    it(name, () => assert.equal(selectExplanationTier(input), tier));
  }
});

const input: CoachExplanationInput = {
  symbol: "BTC",
  koreanName: "비트코인",
  mode: "scalp",
  currentPrice: 100_000_000,
  change24h: -1.5,
  tradeValue24h: 4_210e8,
  evidence: [
    { label: "판단", value: "비트코인 단타 관점은 관망이에요" },
    { label: "근거", value: "RSI 48.2 — 침체 35 · 과열 70 사이" },
    { label: "주의", value: "거래대금이 평소보다 적어요" },
    { label: "RSI", value: "48.2" },
  ],
  stance: "wait",
  news: [
    { title: "현물 ETF 순유입 이어져", source: "코인뉴스", url: "https://news.example/etf", publishedAt: "2026-11-11T03:00:00.000Z" },
    { title: "거래소 점검 공지", source: "거래소" },
  ],
};

describe("인용 — 문장마다 사실표 id 하나 이상, 지어낸 출처 0", () => {
  const catalog = explanationFactCatalog(input, NOW);
  const ids = (cs: { id: string }[]) => cs.map((c) => c.id);

  it("사실표 — 시세 · 판단 · 근거 · 주의 · RSI · 뉴스", () => {
    assert.deepEqual(ids(catalog), ["quote", "judgment", "reason-1", "risk-1", "rsi", "news-1", "news-2"]);
    assert.equal(catalog.find((c) => c.id === "news-1")!.url, "https://news.example/etf");
    assert.equal(catalog.find((c) => c.id === "news-1")!.at, "2026-11-11T03:00:00.000Z");
    assert.equal(catalog.find((c) => c.id === "rsi")!.at, NOW.toISOString());
  });

  it("숫자가 맞는 사실을 인용한다 — 변동률은 시세, 같은 숫자는 사실표 첫 사실 하나(같은 값 칩 두 개 0)", () => {
    assert.deepEqual(ids(citeSentence("modeReasoning", "24시간 -1.5% 움직였어요.", catalog)), ["quote"]);
    assert.deepEqual(ids(citeSentence("keyDrivers", "RSI 48.2 로 중간이에요.", catalog)), ["reason-1"]);
  });

  it("판단 기간을 말하면 시세가 아니라 판단 — 옮긴 사실 글 안 숫자는 다시 맞추지 않는다(2026-11-11 실데이터)", () => {
    assert.deepEqual(ids(citeSentence("risks", "이 판단의 관찰 기간은 판단 뒤 24시간이라서 조건이 바뀔 수 있어요.", catalog)), ["judgment"]);
  });

  it("사실 글을 옮긴 문장은 그 사실", () => {
    assert.deepEqual(ids(citeSentence("risks", "거래대금이 평소보다 적어요", catalog)), ["risk-1"]);
  });

  it("뉴스 칸은 제목이 겹치는 기사 — 뉴스 칸 밖에서는 기사를 인용하지 않는다", () => {
    assert.deepEqual(ids(citeSentence("newsSummary", "현물 ETF 순유입이 이어진다는 소식이 있어요.", catalog)), ["news-1"]);
    assert.ok(!ids(citeSentence("keyDrivers", "현물 ETF 순유입 이어져", catalog)).includes("news-1"));
  });

  it("아무것도 안 맞으면 규칙 판단 — 인용 없는 문장 0", () => {
    assert.deepEqual(ids(citeSentence("modeReasoning", "지금은 지켜보는 구간이에요.", catalog)), ["judgment"]);
  });

  it("템플릿 해설 전체 — 모든 문장에 인용이 있고 칸 순서를 지킨다", () => {
    const sentences = explanationSentences(templateExplanation(input, NOW), catalog);
    assert.ok(sentences.length >= 4);
    assert.ok(sentences.every((s) => s.citations.length >= 1));
    const order = ["modeReasoning", "keyDrivers", "risks", "newsSummary"];
    const seen = sentences.map((s) => order.indexOf(s.section));
    assert.deepEqual(seen, [...seen].sort((a, b) => a - b));
    // 템플릿 뉴스 줄 "제목 (출처)" 은 그 기사를 인용한다
    assert.deepEqual(ids(sentences.filter((s) => s.section === "newsSummary")[0]!.citations), ["news-1"]);
  });

  it("판단만 남은 단 — 판단 한 줄 · 근거, 모두 규칙 판단 인용", () => {
    const sentences = judgmentOnlySentences({ headline: "관망이에요", label: "관망", reasons: ["RSI 48", " "] }, NOW);
    assert.deepEqual(
      sentences.map((s) => [s.section, s.text, s.citations[0]!.id]),
      [
        ["modeReasoning", "관망이에요", "judgment"],
        ["keyDrivers", "RSI 48", "judgment"],
      ]
    );
  });
});

describe("저장 — 검사를 통과한 LLM 문장이 하나라도 있어야 AI 해설", () => {
  const table: Array<[string, Parameters<typeof isStorableExplanation>, boolean]> = [
    ["llm · 남은 문장 3", ["llm", 3], true],
    ["llm_checked · 남은 문장 1", ["llm_checked", 1], true],
    ["llm_checked · 남은 문장 0(전부 템플릿으로 채움)", ["llm_checked", 0], false],
    ["template", ["template", 3], false],
  ];
  for (const [name, args, ok] of table) it(name, () => assert.equal(isStorableExplanation(...args), ok));

  it("LLM 문장 수 — 판단 칸은 문장, 목록은 항목", () => {
    assert.equal(llmSentenceCount({ modeReasoning: "가. 나 +1.2% 예요.", keyDrivers: ["a"], risks: [], newsSummary: ["b", "c"] }), 5);
  });
});
