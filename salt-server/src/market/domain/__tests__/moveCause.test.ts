import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  assembleMoveCauses,
  causeHeadline,
  isQuietMove,
  krwAmount,
  MOVE_CAUSE_LIMIT,
  pickCauseEvents,
  toAfterMove,
  toInvestorEvidence,
  type MoveCauseEvent,
  type MoveCauseInput,
} from "../MoveCause";

/**
 * 원인 → 근거 → 결과 조립(F017 v4 순서 1b · `SRV-REQ-053` FR-11 · FR-17 · `ADR-009` v4).
 * 불변식: ① 근거 없는 원인은 없다 ② 단계는 받치는 근거 수가 정한다 ③ 목록이 비지 않는다 ④ 단정 · 앞날 문장 0.
 */

const AT = new Date("2026-11-13T00:42:00Z");
const base = (over: Partial<MoveCauseInput> = {}): MoveCauseInput => ({
  market: "kr",
  total: 6,
  sigma: 1.8,
  split: { market: 0.5, sector: 0.5, idio: 5, marketName: "코스피", sectorName: "금융", isBenchmark: false },
  marketChange: { rate: 0.4, at: AT },
  sectorChange: { rate: 0.3, at: AT },
  breadth: null,
  events: [],
  program: null,
  investor: null,
  flags: [],
  listedDays: null,
  newsCount: 0,
  ...over,
});
const event = (over: Partial<MoveCauseEvent> = {}): MoveCauseEvent => ({
  factId: "kr-news:1",
  kind: "disclosure",
  at: AT,
  title: "주주환원 확대 결정",
  source: "거래소공시",
  eventKindText: "자사주",
  label: "up_usually",
  reaction: { days: 1, sample: 34, upRate: 0.64, mean: 0.01, baseUpRate: 0.45 },
  preMove5d: 0.038,
  after: { changePct: 2.1, minutes: 30, at: new Date("2026-11-13T01:12:00Z"), afterOpen: false },
  ...over,
});
const top = (input: MoveCauseInput) => assembleMoveCauses(input).causes[0];

describe("원인 단계 — 받치는 근거 수가 정한다(SRV-REQ-053 FR-11)", () => {
  type Case = [string, MoveCauseInput, string, string];
  const cases: Case[] = [
    // 이름 · 입력 → 가장 앞 원인의 종류 · 단계
    ["소식 뒤 움직임 + 과거 반응 + 종목 몫 → 가장 유력", base({ events: [event()] }), "disclosure", "likely"],
    ["소식 뒤 움직임만(종류 모름 · 종목 몫 작음) → 가능성", base({ split: { ...base().split!, idio: 1, market: 5 }, marketChange: { rate: 0.2, at: AT }, events: [event({ eventKindText: null, label: null, reaction: null })] }), "disclosure", "possible"],
    ["소식 뒤 반대로 움직였고 과거 반응 · 종목 몫이 받침 → 근거 둘이어도 시각이 안 맞아 가능성", base({ events: [event({ after: { changePct: -1, minutes: 30, at: AT, afterOpen: false } })] }), "disclosure", "possible"],
    ["소식 뒤 봉이 없고 과거 반응도 엇갈림 — 종목 몫만으로는 소식이 원인이 되지 않는다", base({ events: [event({ after: null, label: "mixed" })] }), "none", "none"],
    ["소식 뒤 봉은 없지만 같은 종류 과거 반응이 받침 → 종목 몫과 둘이어도 시각을 못 재 가능성", base({ events: [event({ after: null })] }), "disclosure", "possible"],
    ["소식 뒤 움직임이 문턱(0.5%) 아래 · 다른 받침 없음 → 원인 아님(확인된 소식 없음)", base({ split: null, events: [event({ after: { changePct: 0.49, minutes: 30, at: AT, afterOpen: false }, label: "mixed" })] }), "none", "none"],
    ["소식 뒤 정확히 0.5% → 받친다", base({ split: null, events: [event({ after: { changePct: 0.5, minutes: 30, at: AT, afterOpen: false }, label: "mixed" })] }), "disclosure", "possible"],
    ["종류를 모르는 기사(시황 묶음 제목)는 소식 뒤 올랐어도 원인이 못 된다", base({ events: [event({ kind: "news", title: "신한지주 +5.18%, KB금융 +3.62%", eventKindText: null, label: null, reaction: null })] }), "none", "none"],
    ["종류가 맞은 기사는 원인 후보", base({ events: [event({ kind: "news" })] }), "news", "likely"],
    ["업종 지수 + 업종 몫 → 업종이 가장 유력", base({ total: 3, split: { market: 0.3, sector: 2.4, idio: 0.3, marketName: "코스피", sectorName: "금융", isBenchmark: false }, sectorChange: { rate: 2.8, at: AT } }), "sector", "likely"],
    ["업종 지수 + 같은 업종 폭(15 중 12) → 가장 유력", base({ total: 3, split: { market: 0.3, sector: 0.9, idio: 1.8, marketName: "코스피", sectorName: "금융", isBenchmark: false }, sectorChange: { rate: 2.8, at: AT }, breadth: { total: 15, up: 12, down: 3 } }), "sector", "likely"],
    ["업종 폭만(지수는 반대) → 가능성 — 시각이 맞는 근거가 없다", base({ total: 3, split: { market: 0.3, sector: 0.2, idio: 2.5, marketName: "코스피", sectorName: "금융", isBenchmark: false }, sectorChange: { rate: -0.1, at: AT }, breadth: { total: 6, up: 4, down: 2 } }), "sector", "possible"],
    ["같은 업종 5 중 3(0.6) — 2/3 문턱 아래라 폭은 받치지 않는다", base({ total: 3, split: { market: 0.3, sector: 0.2, idio: 2.5, marketName: "코스피", sectorName: "금융", isBenchmark: false }, sectorChange: { rate: -0.1, at: AT }, breadth: { total: 5, up: 3, down: 2 } }), "none", "none"],
    ["같은 업종 6 중 4(정확히 2/3) — 받친다", base({ total: 3, split: { market: 0.3, sector: 0.2, idio: 2.5, marketName: "코스피", sectorName: "금융", isBenchmark: false }, sectorChange: { rate: -0.1, at: AT }, breadth: { total: 6, up: 4, down: 2 } }), "sector", "possible"],
    ["같은 업종이 둘뿐이면 폭은 근거로 싣지 않는다", base({ total: 3, split: { market: 0.3, sector: 0.2, idio: 2.5, marketName: "코스피", sectorName: "금융", isBenchmark: false }, sectorChange: { rate: -0.1, at: AT }, breadth: { total: 2, up: 2, down: 0 } }), "none", "none"],
    ["시장 지수 + 시장 몫 → 시장이 가장 유력", base({ total: -9.98, split: { market: -8.6, sector: null, idio: -1.38, marketName: "코스피", sectorName: null, isBenchmark: false }, marketChange: { rate: -8.6, at: AT }, sectorChange: null }), "market", "likely"],
    ["코인 — 비트코인 따라", base({ market: "crypto", total: -4, split: { market: -3, sector: null, idio: -1, marketName: "비트코인", sectorName: null, isBenchmark: false }, marketChange: { rate: -2.8, at: AT }, sectorChange: null }), "market", "likely"],
    ["비트코인 자신은 시장 몫을 원인으로 말하지 않는다", base({ market: "crypto", total: -4, split: { market: -4, sector: null, idio: 0, marketName: "비트코인", sectorName: null, isBenchmark: true }, marketChange: { rate: -4, at: AT }, sectorChange: null }), "none", "none"],
    ["프로그램 7.6배 + 외국인 2배 → 수급이 가장 유력", base({ program: { netValue: 31.2e9, at: AT, usualAbs: 4.1e9, usualDays: 5 }, investor: { date: "2026-11-12", foreign: 34.8e9, institution: 1e9, usualAbsForeign: 10e9, usualAbsInstitution: 5e9, usualDays: 20 } }), "flow", "likely"],
    ["프로그램 정확히 2배 → 받친다(가능성)", base({ program: { netValue: 8e9, at: AT, usualAbs: 4e9, usualDays: 3 } }), "flow", "possible"],
    ["프로그램 1.99배 → 원인 아님", base({ program: { netValue: 7.96e9, at: AT, usualAbs: 4e9, usualDays: 3 } }), "none", "none"],
    ["평소를 2거래일로만 잴 수 있으면 견주지 않는다", base({ program: { netValue: 80e9, at: AT, usualAbs: 4e9, usualDays: 2 } }), "none", "none"],
    ["큰 프로그램 순매도인데 오늘은 올랐다 → 받치지 않는다", base({ program: { netValue: -80e9, at: AT, usualAbs: 4e9, usualDays: 5 } }), "none", "none"],
    ["전날 외국인만 크다 → 가능성까지(오늘 값이 아니다)", base({ investor: { date: "2026-11-12", foreign: 34.8e9, institution: 30e9, usualAbsForeign: 10e9, usualAbsInstitution: 5e9, usualDays: 20 } }), "flow", "possible"],
    ["거래소 표시 → 가능성(지정 시각을 모른다)", base({ market: "crypto", flags: [{ label: "거래 유의 종목", at: null }, { label: "가격 급등락 주의", at: null }] }), "warning", "possible"],
    ["상장 14일 지남 → 가능성 · 15일은 아님", base({ market: "crypto", listedDays: 14 }), "listing", "possible"],
    ["받치는 것이 하나도 없음 → 확인된 소식이 없어요", base(), "none", "none"],
  ];
  for (const [name, input, kind, strength] of cases) {
    it(name, () => {
      const c = top(input);
      assert.deepEqual([c.kind, c.strength], [kind, strength]);
    });
  }

  it("상장 15일째는 새 상장이 아니다", () => assert.equal(top(base({ market: "crypto", listedDays: 15 })).kind, "none"));
});

describe("불변식", () => {
  const rich = base({
    events: [event(), event({ factId: "kr-news:2", kind: "news", title: "같은 사건 기사" })],
    total: 6,
    split: { market: 0.5, sector: 2.6, idio: 2.9, marketName: "코스피", sectorName: "금융", isBenchmark: false },
    sectorChange: { rate: 2.8, at: AT },
    breadth: { total: 15, up: 12, down: 3 },
    program: { netValue: 31.2e9, at: AT, usualAbs: 4.1e9, usualDays: 5 },
    flags: [{ label: "투자주의", at: null }],
  });

  it("근거 없는 원인은 없다 — 목록의 모든 원인은 받치는 근거가 하나 이상(확인된 소식 없음 빼고)", () => {
    for (const c of assembleMoveCauses(rich).causes) {
      assert.ok(c.strength !== "none");
      assert.ok(c.evidence.some((e) => e.supports), c.headline);
    }
  });

  it("가장 유력은 받치는 근거 둘 이상 · 가능성은 하나 이상", () => {
    for (const c of assembleMoveCauses(rich).causes) {
      const n = c.evidence.filter((e) => e.supports).length;
      assert.ok(c.strength === "likely" ? n >= 2 : n >= 1);
    }
  });

  it("강한 것이 앞 · 같은 단계면 공시가 앞 · 상한 셋 · 소식 원인은 하나만", () => {
    const { causes } = assembleMoveCauses(rich);
    assert.equal(causes.length, MOVE_CAUSE_LIMIT);
    assert.deepEqual(causes.map((c) => [c.kind, c.strength]), [["disclosure", "likely"], ["sector", "likely"], ["warning", "possible"]]);
    assert.equal(causes.filter((c) => c.kind === "disclosure" || c.kind === "news").length, 1);
  });

  it("어느 입력에서도 목록이 비지 않는다 — 재료가 전부 없어도", () => {
    const v = assembleMoveCauses(base({ split: null, marketChange: null, sectorChange: null, sigma: null, newsCount: null }));
    assert.equal(v.causes.length, 1);
    assert.deepEqual([v.causes[0].kind, v.causes[0].headline], ["none", "확인된 소식이 없어요"]);
    assert.equal(v.result.text, "오늘 +6.00%");
  });

  it("평소 범위 안의 날은 원인을 찾지 않는다 — 근거가 있어도 이야기를 붙이지 않는다 · 거래소 표시만은 싣는다(사실)", () => {
    const flagged = assembleMoveCauses({ ...rich, total: 0.6 });
    assert.deepEqual(flagged.causes.map((c) => c.kind), ["warning"]);
    const v = assembleMoveCauses({ ...rich, total: 0.6, flags: [] });
    assert.equal(v.causes.length, 1);
    assert.equal(v.causes[0].headline, "평소 범위 안의 움직임이에요");
    assert.ok(v.causes[0].evidence.every((e) => !e.supports));
  });

  it("평소 범위 경계 — σ 의 절반(바닥 0.5%) · σ 를 모르면 1%", () => {
    assert.deepEqual(
      [isQuietMove(0.89, 1.8), isQuietMove(0.9, 1.8), isQuietMove(-0.49, 0.4), isQuietMove(0.5, 0.4), isQuietMove(0.99, null), isQuietMove(-1, null)],
      [true, false, true, false, true, false]
    );
  });

  it("내린 날 — 방향이 뒤집힌 문장 · 근거는 내린 쪽을 센다", () => {
    const c = top(base({ total: -3, split: { market: -0.3, sector: -2.4, idio: -0.3, marketName: "코스피", sectorName: "금융", isBenchmark: false }, marketChange: { rate: -0.3, at: AT }, sectorChange: { rate: -2.8, at: AT }, breadth: { total: 15, up: 3, down: 12 } }));
    assert.equal(c.headline, "금융 업종 전체 하락");
    assert.ok(c.evidence.find((e) => e.kind === "sector_breadth")!.value.includes("15종목 중 12종목이 같이 내렸어요"));
    assert.ok(c.evidence.every((e) => e.supports));
  });
});

describe("근거 한 줄 = 사실 + 숫자 + 비교 + 출처 · 시각", () => {
  it("소식 원인 — 뒤 30분 · 과거 반응 · 종목 몫 · 미리 움직인 폭(받치지 않음)", () => {
    const c = top(base({ events: [event()] }));
    assert.equal(c.headline, "주주환원 확대 결정");
    assert.equal(c.note, "공시 뒤부터 움직였어요"); // 단계 이름은 화면이 붙인다 — 문장에 되풀이 0
    assert.equal(c.factId, "kr-news:1");
    assert.deepEqual(
      c.evidence.map((e) => [e.kind, e.value, e.compare, e.source, e.supports]),
      [
        ["post_move", "공시 뒤 30분 +2.1%", "오늘 +6.00% 중", "시세", true],
        ["past_reaction", "같은 종류(자사주) 소식 과거 34건", "다음 거래일 시장보다 더 오른 경우가 100번 중 64번 · 평소 45번", "과거 34건", true],
        ["idio_share", "이 종목만의 움직임 +5.00%p", "오늘 +6.00% 중", "시세", true],
        ["pre_move", "공시 전 5거래일 +3.8%", "시장 대비 · 소식 전에 이미 움직인 폭이에요", "시세", false],
      ]
    );
    assert.equal(c.evidence[0].at, "2026-11-13T01:12:00.000Z");
  });

  it("장 밖 소식 — 다음 장 첫 봉부터 재고 그렇게 말한다 · 읽은 가격 → 등락 · 분", () => {
    const at = new Date("2026-11-12T22:30:00Z"); // 07:30 KST — 장 전
    const pre = toAfterMove(at, { before: 85_000, after: 88_900, afterAt: new Date("2026-11-13T00:35:00Z"), firstBarAt: new Date("2026-11-13T00:05:00Z") });
    assert.deepEqual(pre, { changePct: 4.59, minutes: 30, at: new Date("2026-11-13T00:35:00Z"), afterOpen: true });
    assert.equal(top(base({ events: [event({ after: pre })] })).evidence[0].value, "공시 뒤 장이 열리고 첫 30분 +4.6%");
    // 장중 소식 — 소식이 걸친 봉부터 · 아직 12분만 지났으면 12분
    const live = toAfterMove(new Date("2026-11-13T01:03:00Z"), { before: 100, after: 101, afterAt: new Date("2026-11-13T01:15:00Z"), firstBarAt: new Date("2026-11-13T01:00:00Z") });
    assert.deepEqual([live?.changePct, live?.minutes, live?.afterOpen], [1, 12, false]);
    // 가격이 0 이거나 봉이 없으면 재료 없음
    assert.equal(toAfterMove(at, undefined), null);
    assert.equal(toAfterMove(at, { before: 0, after: 1, afterAt: at, firstBarAt: at }), null);
  });

  it("투자자 수급 재료 — 가장 최근 확정일 + 그 앞 날들의 |값| 평균 · 앞 날이 없으면 평소 없음", () => {
    const row = (date: string, f: number, i: number) => ({ date, foreign: { value: f }, institution: { value: i } });
    assert.deepEqual(toInvestorEvidence([row("2026-11-12", 30, -10), row("2026-11-11", -10, 20), row("2026-11-10", 20, -40)]), {
      date: "2026-11-12", foreign: 30, institution: -10, usualAbsForeign: 15, usualAbsInstitution: 30, usualDays: 2,
    });
    assert.deepEqual(toInvestorEvidence([row("2026-11-12", 30, -10)])?.usualAbsForeign, null);
    assert.equal(toInvestorEvidence([]), null);
  });

  it("원인 후보 소식 고르기 — 공시가 앞 · 그다음 최신 · 상한 다섯 · 소식이 아닌 사실은 뺀다", () => {
    const f = (id: string, kind: string, min: number) => ({ id, kind, at: new Date(AT.getTime() + min * 60_000), source: "x", title: id });
    const picked = pickCauseEvents([f("n1", "news", 1), f("flow", "flow", 9), f("d1", "disclosure", 0), f("n2", "news", 5), f("n3", "crypto_news", 3), f("n4", "news", 4), f("n5", "news", 2), f("n6", "news", 6)]);
    assert.deepEqual(picked.map((x) => x.id), ["d1", "n6", "n2", "n4", "n3"]);
  });

  it("수급 — 금액 · 평소 대비 배수 · 용어 풀이 · 전날 값은 날짜를 같이", () => {
    const c = top(base({ program: { netValue: 31.2e9, at: AT, usualAbs: 4.1e9, usualDays: 5 }, investor: { date: "2026-11-12", foreign: 34.8e9, institution: -1e9, usualAbsForeign: 10e9, usualAbsInstitution: 5e9, usualDays: 20 } }));
    assert.deepEqual(c.evidence.map((e) => [e.value, e.compare, e.supports]), [
      ["프로그램 순매수 312억 원", "최근 5거래일 평균(41억 원)의 7.6배", true],
      ["11/12 외국인 순매수 348억 원", "최근 20거래일 평균(100억 원)의 3.5배", true],
      ["11/12 기관 순매도 10억 원", "최근 20거래일 평균(50억 원)의 0.2배", false],
    ]);
    assert.ok(c.evidence[0].gloss?.includes("자동으로 내는 주문"));
  });

  it("수급 머리말은 받치는 근거가 정한다 — 전날 외국인만 받치면 오늘 주문처럼 말하지 않는다", () => {
    const investor = { date: "2026-11-12", foreign: 34.8e9, institution: -33.2e9, usualAbsForeign: 11.9e9, usualAbsInstitution: 12.5e9, usualDays: 20 };
    assert.equal(top(base({ program: { netValue: 7.4e9, at: AT, usualAbs: 10.3e9, usualDays: 5 }, investor })).headline, "11/12 외국인 순매수가 평소보다 컸어요");
    assert.equal(top(base({ program: { netValue: 31.2e9, at: AT, usualAbs: 4.1e9, usualDays: 5 }, investor })).headline, "프로그램 순매수가 평소보다 컸어요");
    assert.equal(top(base({ total: -6, program: { netValue: -1.2e12, at: AT, usualAbs: 4.1e9, usualDays: 5 } })).headline, "프로그램 순매도가 평소보다 컸어요");
  });

  it("소식 수 옆 한마디는 실제로 본 것만 — 0건 · 작은 날 · 가격을 잰 수 · 잴 봉 없음", () => {
    const line = (i: MoveCauseInput) => top(i).evidence.find((e) => e.kind === "news_count")!.compare;
    const quietTitle = event({ after: { changePct: 0.1, minutes: 30, at: AT, afterOpen: false }, label: "mixed" });
    assert.equal(line(base({ newsCount: 0 })), "세상에 소식이 없다는 뜻은 아니에요");
    assert.equal(line(base({ total: 0.3, newsCount: 29, events: [quietTitle] })), "작은 움직임이라 소식과 견주지 않았어요");
    assert.equal(line(base({ split: null, newsCount: 20, events: [quietTitle, { ...quietTitle, factId: "b" }, event({ factId: "c", after: null, label: "mixed" })] })), "최근 2건 뒤 30분 가격은 오늘 방향으로 뚜렷이 움직이지 않았어요");
    assert.equal(line(base({ split: null, newsCount: 3, events: [event({ after: null, label: "mixed" })] })), "소식 뒤 가격을 잴 봉이 아직 없어요");
    assert.equal(line(base({ split: null, newsCount: 20, events: [event({ kind: "news", eventKindText: null, label: null, reaction: null })] })), "무슨 일인지 알 수 있는 소식(공시 · 종류가 맞은 기사)은 없었어요");
  });

  it("코인 시장 몫 — '오늘 −4.0% 중 −3.0%p 는 비트코인 따라 · 나머지 −1.0%p'", () => {
    const c = top(base({ market: "crypto", total: -4, split: { market: -3, sector: null, idio: -1, marketName: "비트코인", sectorName: null, isBenchmark: false }, marketChange: { rate: -2.8, at: AT }, sectorChange: null }));
    assert.deepEqual(c.evidence.map((e) => [e.value, e.compare]), [
      ["비트코인 −2.8%", null],
      ["오늘 −4.00% 중 −3.00%p는 비트코인 따라", "나머지 −1.00%p"],
    ]);
  });

  it("확인된 소식 없음 — 평소 대비 크기 · 모은 소식 수(세상에 없다는 뜻이 아님)", () => {
    const c = top(base({ split: null }));
    assert.deepEqual(c.evidence.map((e) => [e.value, e.compare]), [
      ["오늘 +6.00%", "평소 하루 변동(±1.8%)의 3.3배"],
      ["우리가 모은 오늘 소식 0건", "세상에 소식이 없다는 뜻은 아니에요"],
    ]);
    assert.equal(c.note, "아직 알려지지 않은 이유일 수 있어요");
  });

  it("결과 — 오늘 등락 + 가장 앞 원인이 종류가 맞은 소식이면 과거 기록 한 줄", () => {
    assert.deepEqual(assembleMoveCauses(base({ events: [event()] })).result, {
      changeRate: 6,
      text: "오늘 +6.00%",
      past: "같은 종류(자사주) 소식 과거 34건 뒤 다음 거래일, 시장보다 더 오른 경우가 100번 중 64번이었어요(평소 45번).",
    });
    assert.equal(assembleMoveCauses(base()).result.past, null);
  });

  it("문장에 단정 · 명령 · 앞날 낱말이 없다", () => {
    const all = [base({ events: [event()] }), base(), base({ total: 0.2 }), base({ market: "crypto", listedDays: 3, flags: [{ label: "거래 유의 종목", at: null }] })]
      .flatMap((i) => assembleMoveCauses(i).causes)
      .flatMap((c) => [c.headline, c.note, ...c.evidence.flatMap((e) => [e.value, e.compare ?? "", e.gloss ?? ""])])
      .join("\n");
    assert.doesNotMatch(all, /때문|덕분|탓|반드시|확실|오를 것|내릴 것|사세요|파세요|호재|악재/);
  });
});

describe("머리말 · 상장 문장", () => {
  it("한 점 목표가는 원인 머리말에서 뺀다 — 나머지 제목은 원문 그대로", () => {
    assert.deepEqual(
      [
        "[리포트 브리핑]삼성생명, '3Q26 Re: 양호한 흐름 지속, 향후 배당 확대 기대' 목표가 400,000원 - 키움증권",
        "HMM 목표주가 3만원으로 상향",
        "적정주가: 95,000원 유지",
        "주주환원 확대 결정",
      ].map(causeHeadline),
      ["[리포트 브리핑]삼성생명, '3Q26 Re: 양호한 흐름 지속, 향후 배당 확대 기대' - 키움증권", "HMM", "유지", "주주환원 확대 결정"]
    );
    const c = top(base({ events: [event({ title: "삼성생명 목표가 400,000원 - 키움증권" })] }));
    assert.doesNotMatch(c.headline, /목표|\d{3},\d{3}원/);
  });

  it("상장 날 수 — 0일은 '오늘 상장' · 하루째부터 셈", () => {
    const at = (d: number) => top(base({ market: "crypto", listedDays: d }));
    assert.deepEqual([at(0).headline, at(0).evidence[0].value], ["오늘 원화 마켓에 상장한 코인", "상장 첫날"]);
    assert.deepEqual([at(3).headline, at(3).evidence[0].value], ["원화 마켓에 상장한 지 3일 된 코인", "상장 4일째"]);
  });
});

describe("금액 모양", () => {
  it("조 · 억 · 만 · 원", () => {
    assert.deepEqual([1.4e12, 31.2e9, -4.1e9, 42_000_000, 9_999].map(krwAmount), ["1.4조 원", "312억 원", "41억 원", "4,200만 원", "9,999원"]);
  });
});
