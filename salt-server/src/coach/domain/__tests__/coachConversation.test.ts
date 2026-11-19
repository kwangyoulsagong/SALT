import assert from "node:assert/strict";
import { describe, it } from "node:test";

import Decimal from "decimal.js";

import {
  COACH_CHIP_QUESTION,
  COACH_QUESTION_CHIPS,
  ANSWER_MATERIALS,
  cardSentence,
  composeCoachAnswer,
  composeCoachBriefing,
  conversationTitle,
  languageViolations,
  nearestPlanStage,
  routeCoachQuestion,
  type CoachAnswerFacts,
  type CoachQuestionIntent,
  type RiskAnswerFacts,
  type SellPlanFacts,
} from "../policy";

/**
 * 코치 대화 규칙(F006 C절 · `SRV-REQ-028` FR-20~22 · 29 · 40~46).
 *
 * 불변식 한 줄: **어떤 재료 조합에서도 답 문장은 검사기를 지나고, 못 읽은 재료는 0 이 아니라 "불러올 수 없어요"다.**
 */

const risk = (over: Partial<RiskAnswerFacts> = {}): RiskAnswerFacts => ({
  totalValueKrw: new Decimal("12345678.6"),
  drawdown: { status: "ok", budgetKrw: new Decimal(1_000_000), usedKrw: new Decimal(250_000) },
  concentration: { status: "ok", topSymbol: "BTC", topWeight: new Decimal("0.42"), limit: new Decimal("0.6") },
  btcBeta: { status: "ok", btcEquivalentKrw: new Decimal(9_000_000) },
  ...over,
});

const plan = (symbol: string, status: SellPlanFacts["status"], rate = 5): SellPlanFacts => ({
  symbol,
  status,
  unrealizedProfitRate: rate,
  currentPrice: 100,
  stages: [
    { label: "손실 제한", price: 96.9 },
    { label: "1차 익절 검토", price: 110 },
  ],
});

const facts = (over: Partial<CoachAnswerFacts> = {}): CoachAnswerFacts => ({
  risk: risk(),
  plans: [plan("BTC", "hold_plan")],
  behavior: { status: "active", transactionCount: 12, minimumRequired: 3, warnings: [{ title: "잦은 매매", message: "한 주에 7번 거래했어요." }] },
  perTradeMaxLossKrw: new Decimal(50_000),
  weeklyPlan: { configured: true, totalKrw: 300_000, items: [{ asset: "btc", amountKrw: 150_000 }, { asset: "kospi", amountKrw: 150_000 }], fixed: true },
  ...over,
});

describe("routeCoachQuestion — 규칙 분류(FR-21 · 22)", () => {
  const table: Array<[string, CoachQuestionIntent]> = [
    ["지금 팔아야 하나?", "sell_check"],
    ["BTC 익절할까", "sell_check"],
    ["이번 주 얼마 넣을까?", "weekly_amount"],
    ["적립 얼마나 해야 돼", "weekly_amount"],
    ["내 포트폴리오 위험한가?", "risk_check"],
    ["너무 한 종목에 쏠려 있나", "risk_check"],
    ["내가 뭘 잘못했나?", "mistake_review"],
    ["손절을 잘못했나", "mistake_review"], // 복기가 매도보다 앞
    ["비트코인 매수해줘", "order_request"],
    ["이더리움 팔아줘", "order_request"],
    ["대신 주문 넣어 줘", "order_request"],
    ["오늘 날씨 어때", "other"],
    ["", "other"],
  ];
  for (const [question, intent] of table) {
    it(`"${question}" → ${intent}`, () => assert.equal(routeCoachQuestion(question), intent));
  }

  it("칩이 있으면 문장보다 칩이 이긴다", () => {
    assert.equal(routeCoachQuestion("매수해줘", "risk_check"), "risk_check");
  });

  it("칩 넷마다 저장 문장이 있고 그 문장이 같은 칩으로 분류된다", () => {
    for (const chip of COACH_QUESTION_CHIPS) assert.equal(routeCoachQuestion(COACH_CHIP_QUESTION[chip]), chip);
  });
});

describe("composeCoachAnswer — 모든 갈래가 검사기를 지난다(FR-40~46)", () => {
  const intents: CoachQuestionIntent[] = ["sell_check", "weekly_amount", "risk_check", "mistake_review", "order_request", "other"];
  const variants: Array<[string, CoachAnswerFacts]> = [
    ["기본", facts()],
    ["재료 전부 못 읽음", facts({ risk: null, plans: null, behavior: null, perTradeMaxLossKrw: undefined })],
    ["보유 0", facts({ risk: risk({ totalValueKrw: new Decimal(0) }), plans: [] })],
    [
      "넘음",
      facts({
        risk: risk({
          drawdown: { status: "exceeded", budgetKrw: new Decimal(100_000), usedKrw: new Decimal(130_000) },
          concentration: { status: "exceeded", topSymbol: "XRP", topWeight: new Decimal("0.71"), limit: new Decimal("0.6") },
        }),
        plans: [plan("A", "stop_loss_review", -12), plan("B", "take_profit_review", 30), plan("C", "raise_stop_review"), plan("D", "hold_plan")],
      }),
    ],
    ["예산 없음 · 표본 적음", facts({
      risk: risk({ drawdown: { status: "budget_not_set", budgetKrw: null, usedKrw: null } }),
      behavior: { status: "insufficient_data", transactionCount: 1, minimumRequired: 3, warnings: [] },
      perTradeMaxLossKrw: null,
    })],
    ["습관 없음", facts({ behavior: { status: "stable", transactionCount: 20, minimumRequired: 3, warnings: [] } })],
  ];
  for (const [name, input] of variants) {
    for (const intent of intents) {
      it(`${name} · ${intent}`, () => {
        const answer = composeCoachAnswer(intent, input);
        assert.equal(answer.dropped, 0, `틀 문장이 검사기에 걸렸다: ${answer.sentences.join(" / ")}`);
        assert.ok(answer.sentences.length > 0);
        for (const sentence of answer.sentences) assert.deepEqual(languageViolations(sentence), [], sentence);
      });
    }
  }

  it("못 읽은 재료는 0 원이 아니라 불러올 수 없음 + gap", () => {
    const answer = composeCoachAnswer("risk_check", facts({ risk: null }));
    assert.deepEqual(answer.gaps, ["risk"]);
    assert.ok(answer.sentences.every((sentence) => !/0원/.test(sentence)));
    assert.match(answer.sentences[0], /불러올 수 없/);
  });

  it("위험 답의 숫자는 재료를 옮긴 것이다(원 단위 반올림 · 백분율 표기만)", () => {
    const text = composeCoachAnswer("risk_check", facts()).sentences.join(" ");
    assert.match(text, /12,345,679원/);
    assert.match(text, /가장 큰 BTC가 42%로 상한 60% 안이에요/);
    assert.match(text, /1,000,000원 중 250,000원을 썼어요/);
  });

  it("조사는 읽는 소리로 · 넘음 문장(2026-11-18 실데이터에서 '원로' · '원를' · 'BTC 이')", () => {
    const text = composeCoachAnswer(
      "risk_check",
      facts({
        risk: risk({
          drawdown: { status: "exceeded", budgetKrw: new Decimal(500_000), usedKrw: new Decimal(1_747_350) },
          concentration: { status: "exceeded", topSymbol: "XRP", topWeight: new Decimal("0.71"), limit: new Decimal("0.6") },
        }),
      })
    ).sentences.join(" ");
    assert.match(text, /XRP가 71%로 정해 둔 상한 60%를 넘었어요/);
    assert.match(text, /1,747,350원으로 한도 500,000원을 넘었어요/);
    assert.match(composeCoachAnswer("weekly_amount", facts()).sentences.join(" "), /300,000원이에요/);
  });

  it("손익률은 퍼센트 단위 그대로(12 = 12% — 100 을 곱하지 않는다, 2026-11-18 −1802.2% 결함)", () => {
    const text = composeCoachAnswer("sell_check", facts({ plans: [plan("BTC", "stop_loss_review", -18.022)] })).sentences.join(" ");
    assert.match(text, /BTC는 평가 손익 -18%로/);
    assert.match(composeCoachAnswer("sell_check", facts({ plans: [plan("ETH", "take_profit_review", 30)] })).sentences.join(" "), /ETH는 평가 손익 \+30%로/);
  });

  it("팔기 답은 손실 제한 검토가 먼저이고 셋까지만 문장으로", () => {
    const answer = composeCoachAnswer(
      "sell_check",
      facts({ plans: [plan("D", "hold_plan"), plan("A", "stop_loss_review", -12), plan("B", "take_profit_review"), plan("C", "raise_stop_review")] })
    );
    assert.match(answer.sentences[1], /^A는/);
    assert.match(answer.sentences.join(" "), /나머지 1개/);
    assert.deepEqual(answer.links[1], { kind: "symbol", symbol: "A" });
  });

  it("가장 가까운 점검 가격은 지금가 대비 거리로 고른다", () => {
    assert.deepEqual(nearestPlanStage(plan("A", "hold_plan")), { label: "손실 제한", gap: -0.031 });
    assert.equal(nearestPlanStage({ ...plan("A", "hold_plan"), currentPrice: 0 }), null);
    assert.equal(nearestPlanStage({ ...plan("A", "hold_plan"), stages: [] }), null);
  });

  it("주문 요청엔 주문하지 않는다는 문장 — 주문 경로 0(FR-29)", () => {
    assert.match(composeCoachAnswer("order_request", facts()).sentences[0], /주문을 내지 않아요/);
  });

  it("검사기에 걸리는 행동 경고 문장은 빼고 센다", () => {
    const answer = composeCoachAnswer(
      "mistake_review",
      facts({ behavior: { status: "active", transactionCount: 9, minimumRequired: 3, warnings: [{ title: "추격", message: "무조건 오릅니다" }] } })
    );
    assert.equal(answer.dropped, 1);
    assert.ok(answer.sentences.every((sentence) => !/무조건/.test(sentence)));
  });
});

describe("conversationTitle", () => {
  it("40자 넘으면 자른다", () => {
    assert.equal(conversationTitle("가".repeat(50)).length, 40);
    assert.equal(conversationTitle("  지금   팔아야 하나? "), "지금 팔아야 하나?");
  });
});

describe("추천 카드 문장 · 오늘의 브리핑(2단계)", () => {
  const cards: CoachAnswerFacts["recommendation"][] = [
    undefined,
    null,
    "unavailable",
    { renderable: true, symbol: "BTC", staleHours: 2 },
    { renderable: true, symbol: "005930", staleHours: 49.7 },
    { renderable: false, symbol: null, staleHours: 0 },
    { renderable: false, symbol: null, staleHours: 24 },
  ];
  const planSets: Array<SellPlanFacts[] | null> = [
    null,
    [],
    [plan("BTC", "hold_plan")],
    [plan("BTC", "stop_loss_review", -12), plan("ETH", "take_profit_review", 30), plan("XRP", "raise_stop_review", 15)],
  ];
  const risks: Array<RiskAnswerFacts | null> = [
    null,
    risk({ totalValueKrw: new Decimal(0) }),
    risk(),
    risk({ concentration: { status: "exceeded", topSymbol: "BTC", topWeight: new Decimal("0.8"), limit: new Decimal("0.6") } }),
    risk({ drawdown: { status: "budget_not_set", budgetKrw: null, usedKrw: null } }),
  ];

  it("카드 문장 — 모든 갈래가 검사기를 지나고 · 없음 = 문장 없음 · 24시간부터 나이", () => {
    for (const card of cards) {
      const line = cardSentence(card);
      if (card === undefined || card === null) assert.equal(line, null);
      else assert.deepEqual(languageViolations(line!), [], line!);
    }
    assert.match(cardSentence({ renderable: true, symbol: "005930", staleHours: 49.7 })!, /49시간 전/);
    assert.doesNotMatch(cardSentence({ renderable: true, symbol: "BTC", staleHours: 23.9 })!, /시간 전/);
  });

  it("카드는 팔기 · 이번 주 금액 질문에만 — 다른 질문은 카드가 있어도 문장이 없다", () => {
    const facts = { risk: risk(), plans: [plan("BTC", "hold_plan")], behavior: null, perTradeMaxLossKrw: null, recommendation: cards[3] };
    for (const intent of ["sell_check", "weekly_amount", "risk_check", "mistake_review", "order_request", "other"] as CoachQuestionIntent[]) {
      const has = composeCoachAnswer(intent, facts).sentences.some((s) => /코치 판단/.test(s));
      assert.equal(has, ANSWER_MATERIALS[intent].includes("recommendation"), intent);
    }
  });

  it("브리핑 — 재료 조합 전부(4 × 5 × 7)에서 검사기 통과 · 0 을 쓰지 않음 · 머리와 꼬리", () => {
    let n = 0;
    for (const plans of planSets)
      for (const r of risks)
        for (const recommendation of cards) {
          const briefing = composeCoachBriefing({ plans, risk: r, recommendation: recommendation ?? null });
          n += 1;
          assert.equal(briefing.dropped, 0, briefing.sentences.join(" | "));
          assert.match(briefing.sentences[0], /오늘의 브리핑/);
          assert.match(briefing.sentences.at(-1)!, /아래 질문/);
          assert.ok(!/ 0개/.test(briefing.sentences.join(" ")));
          assert.equal(briefing.gaps.includes("plans"), plans === null);
          assert.equal(briefing.gaps.includes("risk"), r === null);
          assert.equal(briefing.gaps.includes("recommendation"), recommendation === "unavailable");
        }
    assert.equal(n, 140);
  });
});

describe("이번 주 얼마 넣을까 — 밴드 적립 주간 계획(2026-11-19 — 전에는 '적립 계산은 아직 없어요')", () => {
  const weekly = (weeklyPlan: CoachAnswerFacts["weeklyPlan"]) => composeCoachAnswer("weekly_amount", facts({ weeklyPlan }));
  it("계획 있음 — 서버 금액 그대로 · 자산별 · 적립 화면 링크", () => {
    const answer = weekly({ configured: true, totalKrw: 300_000, items: [{ asset: "btc", amountKrw: 180_000 }, { asset: "kospi", amountKrw: 120_000 }], fixed: true });
    const text = answer.sentences.join(" ");
    assert.match(text, /이번 주 적립 계획은 300,000원이에요 — 비트코인 180,000원 · 코스피 120,000원/);
    assert.doesNotMatch(text, /아직 SALT에 없어요|바뀔 수 있어요/);
    assert.deepEqual(answer.links, [{ kind: "plan" }]);
    assert.deepEqual(answer.gaps, []);
  });
  it("굳지 않은 주 — 회차 뒤 바뀔 수 있다는 한 줄", () => {
    const text = weekly({ configured: true, totalKrw: 300_000, items: [{ asset: "btc", amountKrw: 150_000 }, { asset: "kospi", amountKrw: 150_000 }], fixed: false }).sentences.join(" ");
    assert.match(text, /예측 회차가 끝나면 금액이 바뀔 수 있어요/);
  });
  it("안 정함 — 정하는 곳으로 · 금액 0 을 쓰지 않는다", () => {
    const answer = weekly({ configured: false, totalKrw: null, items: [{ asset: "btc", amountKrw: null }, { asset: "kospi", amountKrw: null }], fixed: false });
    assert.match(answer.sentences.join(" "), /월 적립액을 정해 두면/);
    assert.doesNotMatch(answer.sentences.join(" "), /0원/);
    assert.deepEqual(answer.links, [{ kind: "plan" }]);
  });
  it("못 읽음 — 그 문장 대신 불러올 수 없어요 · 빈 재료 표시", () => {
    const answer = weekly(undefined);
    assert.match(answer.sentences.join(" "), /불러올 수 없어요/);
    assert.deepEqual(answer.gaps, ["weekly_plan"]);
  });
  it("지시형 · 확신 표현 0(검사기 통과 — 뺀 문장 0)", () => {
    const answer = weekly({ configured: true, totalKrw: 300_000, items: [{ asset: "btc", amountKrw: 150_000 }, { asset: "kospi", amountKrw: 150_000 }], fixed: false });
    assert.equal(answer.dropped, 0);
    assert.doesNotMatch(answer.sentences.join(" "), /사세요|넣으세요|반드시|확실/);
  });
});

