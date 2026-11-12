import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  MOVE_SUMMARY_DAILY_ATTEMPTS,
  MOVE_SUMMARY_FACTS_MAX,
  MOVE_SUMMARY_QUIET_TEXT,
  moveQuietReason,
  moveSummaryFingerprint,
  moveSummaryPromptFacts,
  needsMoveSummary,
  selectMoveSummary,
  verifyMoveSummary,
  type MoveCard,
  type MoveSummaryFact,
  type StoredMoveSummary,
} from "../policy";

/** 오늘 등락 한 줄(③) — F016 단계 D · `SRV-REQ-052` · `ADR-009` */

const at = (hm: string) => new Date(`2026-11-12T${hm}:00+09:00`);
const news = (id: string, hm: string, title: string, kind: MoveSummaryFact["kind"] = "disclosure"): MoveSummaryFact => ({
  id,
  kind,
  at: at(hm),
  source: "한국거래소",
  title,
  value: null,
});

const FACTS = [
  news("kr-news:1", "09:10", "단일판매ㆍ공급계약체결(자율공시) 매출액 대비 23.5%"),
  news("kr-news:2", "10:30", "○○바이오, 신약 임상 2상 결과 발표", "news"),
  { id: "kr-vi:1", kind: "vi" as const, at: at("10:41"), source: "KRX", title: "vi:static:1", value: 51200 },
];

const card = (over: Partial<MoveCard> = {}): MoveCard => ({
  asset: "kr",
  symbol: "123456",
  date: "2026-11-12",
  show: true,
  split: { total: 18, market: -6.9, sector: null, idio: 24.9, method: "regression" },
  facts: FACTS,
  ...over,
});

const promptFacts = moveSummaryPromptFacts(FACTS);

describe("moveQuietReason — 조용한 날 경계", () => {
  const cases: Array<[string, Partial<MoveCard["split"] & object>, MoveSummaryFact[], ReturnType<typeof moveQuietReason>]> = [
    ["고유 몫이 크다", { total: 18, idio: 24.9 }, FACTS, null],
    ["사실 0", { total: 18, idio: 24.9 }, [], "no_facts"],
    ["고유 몫 1%p 미만", { total: 3, idio: 0.99 }, FACTS, "small_idio"],
    ["고유 몫 정확히 1%p · 비율 33% → 조용하지 않음", { total: 3, idio: 1 }, FACTS, null],
    ["서킷브레이커 날 삼성전자(고유 14%)", { total: -9.98, idio: -1.4 }, FACTS, "small_idio"],
    ["비율 30% 경계 — 30% 는 통과", { total: -10, idio: -3 }, FACTS, null],
    ["비율 29% 는 조용", { total: -10, idio: -2.9 }, FACTS, "small_idio"],
  ];
  for (const [name, split, facts, want] of cases) {
    it(name, () => {
      const s = { total: 0, market: 0, sector: null, idio: 0, method: "regression" as const, ...split };
      assert.equal(moveQuietReason({ split: s, facts }), want);
    });
  }
  it("벤치마크(BTC)는 등락 전체를 고유 몫으로 본다", () => {
    assert.equal(
      moveQuietReason({ split: { total: -8, market: -8, sector: null, idio: 0, method: "benchmark" }, facts: FACTS }),
      null
    );
  });
});

describe("moveSummaryPromptFacts · 지문", () => {
  it("최신 상한 · 시각 오름차순 번호", () => {
    const many = Array.from({ length: MOVE_SUMMARY_FACTS_MAX + 5 }, (_, i) =>
      news(`kr-news:${i}`, `${String(9 + Math.floor(i / 6)).padStart(2, "0")}:${String((i % 6) * 10).padStart(2, "0")}`, `제목 ${i}`)
    );
    const p = moveSummaryPromptFacts(many);
    assert.equal(p.length, MOVE_SUMMARY_FACTS_MAX);
    assert.equal(p[0]!.n, 1);
    assert.ok(p[0]!.at <= p[p.length - 1]!.at);
    assert.equal(p[p.length - 1]!.id, `kr-news:${many.length - 1}`);
  });
  it("사건 코드는 문장으로, 제목은 그대로", () => {
    assert.equal(promptFacts[2]!.text, "변동성 완화장치(VI) 발동(정적)");
    assert.equal(promptFacts[0]!.text, FACTS[0]!.title);
  });
  it("지문은 몫 숫자와 무관 · 사실 순서와 무관 · 새 사실이면 바뀜", () => {
    const a = moveSummaryFingerprint(card());
    assert.equal(a, moveSummaryFingerprint(card({ split: { total: 20, market: -5, sector: null, idio: 25, method: "regression" } })));
    assert.equal(a, moveSummaryFingerprint(card({ facts: [...FACTS].reverse() })));
    assert.notEqual(a, moveSummaryFingerprint(card({ facts: [...FACTS, news("kr-news:9", "11:00", "새 공시")] })));
    assert.notEqual(a, moveSummaryFingerprint(card({ date: "2026-11-13" })));
  });
});

describe("verifyMoveSummary — 허용 · 거절 경계", () => {
  const ok: Array<[string, string, string, string[]]> = [
    ["인용 하나", "같은 날 공급계약 체결 공시가 있었어요[1].", "같은 날 공급계약 체결 공시가 있었어요[1].", ["kr-news:1"]],
    [
      "인용 번호를 나온 순서로 다시 매김",
      "임상 결과 발표[2] 뒤 VI가 발동됐어요[3].",
      "임상 결과 발표[1] 뒤 VI가 발동됐어요[2].",
      ["kr-news:2", "kr-vi:1"],
    ],
    ["사실 글 속 숫자는 옮겨도 됨", "매출액 대비 23.5% 규모 공급계약 공시가 있었어요[1].", "매출액 대비 23.5% 규모 공급계약 공시가 있었어요[1].", ["kr-news:1"]],
    ["시각은 숫자 대조에서 뺀다", "오전 10시 30분 임상 2상 결과 발표가 있었어요[2].", "오전 10시 30분 임상 2상 결과 발표가 있었어요[1].", ["kr-news:2"]],
    [
      "첫 문장이 걸리면 다음 문장",
      "공시 때문에 올랐어요[1]. 같은 날 공급계약 공시가 있었어요[1].",
      "같은 날 공급계약 공시가 있었어요[1].",
      ["kr-news:1"],
    ],
  ];
  for (const [name, raw, text, citations] of ok) {
    it(`통과: ${name}`, () => assert.deepEqual(verifyMoveSummary(raw, promptFacts), { ok: true, text, citations }));
  }

  const rejected: Array<[string, string, "no_citation" | "guard_blocked", string]> = [
    ["인용 없음", "공급계약 공시가 있었어요.", "no_citation", "no_citation"],
    ["없는 번호", "공시가 있었어요[7].", "no_citation", "unknown_citation"],
    ["원인 단정", "공급계약 공시 때문에 주가가 올랐어요[1].", "guard_blocked", "causal"],
    ["영향으로", "임상 발표 영향으로 강세였어요[2].", "guard_blocked", "causal"],
    ["호재", "공급계약이라는 호재가 있었어요[1].", "guard_blocked", "causal"],
    ["앞날", "공시가 있었고 추가 상승이 기대돼요[1].", "guard_blocked", "future"],
    ["분해 숫자(지어냄)", "고유 몫 24.9%p 와 함께 공시가 있었어요[1].", "guard_blocked", "unverified_number"],
    ["매매 지시", "공시가 있었으니 매수하세요[1].", "guard_blocked", "imperative_trade"],
    ["너무 김", `${"공급계약 공시가 있었어요 ".repeat(10)}[1].`, "guard_blocked", "too_long"],
  ];
  for (const [name, raw, gate, reason] of rejected) {
    it(`거절: ${name}`, () => {
      const v = verifyMoveSummary(raw, promptFacts);
      assert.equal(v.ok, false);
      if (!v.ok) {
        assert.equal(v.gate, gate);
        assert.ok(v.reasons.includes(reason as never), `${v.reasons.join(",")} 에 ${reason} 없음`);
      }
    });
  }
  it("인용한 제목을 옮긴 부분의 '전망'은 우리 주장이 아니다", () => {
    const facts = moveSummaryPromptFacts([news("kr-news:5", "09:00", "4분기 실적 전망 공정공시")]);
    const v = verifyMoveSummary("4분기 실적 전망 공정공시가 있었어요[1].", facts);
    assert.equal(v.ok, true);
  });
});

const stored = (over: Partial<StoredMoveSummary> = {}): StoredMoveSummary => ({
  fingerprint: "fp",
  gate: "ok",
  text: "공시가 있었어요[1].",
  citations: ["kr-news:1"],
  generatedAt: at("10:00"),
  ...over,
});

describe("selectMoveSummary — 설명 3종 게이트", () => {
  it("꺼짐 · 분해 없음 · 카드 아님", () => {
    assert.equal(selectMoveSummary({ enabled: false, card: card(), current: null, latestOk: stored() }).gate, "disabled");
    assert.equal(selectMoveSummary({ enabled: true, card: card({ split: null }), current: null, latestOk: stored() }).gate, "no_split");
    assert.equal(selectMoveSummary({ enabled: true, card: card({ show: false }), current: null, latestOk: stored() }).gate, "no_card");
  });
  it("조용한 날 = 서버 문장 · AI 표시 없음", () => {
    const v = selectMoveSummary({ enabled: true, card: card({ facts: [] }), current: null, latestOk: stored() });
    assert.deepEqual(v, { gate: "quiet", summary: { text: MOVE_SUMMARY_QUIET_TEXT, citations: [], label: "server", generatedAt: null } });
  });
  it("성공본 인용이 지금 사실에 다 있으면 보임 — 지문이 달라도", () => {
    const v = selectMoveSummary({ enabled: true, card: card(), current: null, latestOk: stored() });
    assert.equal(v.gate, "ok");
    assert.equal(v.summary?.label, "ai");
  });
  it("인용 하나라도 지금 사실에 없으면 안 보임 → pending", () => {
    const v = selectMoveSummary({ enabled: true, card: card(), current: null, latestOk: stored({ citations: ["kr-news:1", "kr-news:gone"] }) });
    assert.deepEqual(v, { gate: "pending", summary: null });
  });
  it("지금 지문의 실패는 그 사유", () => {
    const v = selectMoveSummary({ enabled: true, card: card(), current: stored({ gate: "guard_blocked", text: null, citations: [] }), latestOk: null });
    assert.deepEqual(v, { gate: "guard_blocked", summary: null });
  });
});

describe("needsMoveSummary — 같은 지문 LLM 1회 · 하루 상한", () => {
  it("경계", () => {
    assert.equal(needsMoveSummary({ card: card(), current: null, attemptsToday: 0 }), "generate");
    assert.equal(needsMoveSummary({ card: card(), current: stored(), attemptsToday: 0 }), "skip_same");
    assert.equal(needsMoveSummary({ card: card({ show: false }), current: null, attemptsToday: 0 }), "skip_no_card");
    assert.equal(needsMoveSummary({ card: card({ facts: [] }), current: null, attemptsToday: 0 }), "skip_quiet");
    assert.equal(needsMoveSummary({ card: card(), current: null, attemptsToday: MOVE_SUMMARY_DAILY_ATTEMPTS - 1 }), "generate");
    assert.equal(needsMoveSummary({ card: card(), current: null, attemptsToday: MOVE_SUMMARY_DAILY_ATTEMPTS }), "skip_daily_cap");
  });
});
