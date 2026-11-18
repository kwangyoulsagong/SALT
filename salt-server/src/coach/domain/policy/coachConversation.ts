import Decimal from "decimal.js";

import { DomainError, ErrorKind } from "../../../shared/domain";
import { withJosa } from "../../../shared/lib/josa";
import { languageViolations } from "./languageGuard";

/**
 * 코치 대화 — 질문 분류 · 규칙 답(F006 C절 · `SRV-REQ-028` FR-20~22 · FR-29 · FR-40~45).
 *
 * ## 답은 서버 규칙 문장이다
 *
 * 숫자는 이미 있는 계산(위험 예산 · 익절/손절 계획 · 행동 코치)이 낸 것을 그대로 옮기고, 문장은 이 파일의 틀이 만든다.
 * LLM 은 이번 판에 없다 — 해설에서 템플릿이 LLM 글을 이겼고(F008 FR-49 20:20 · O3 20:0) 작성기 공통 결함 셋이 같은 날 나왔다(근거 줄 후속 A/B).
 * LLM 다듬기를 붙이려면 같은 블라인드 A/B 를 먼저 지난다.
 *
 * 모든 문장은 `languageViolations` 를 지난다 — 걸리면 그 문장을 빼고 `dropped` 에 센다(FR-46). 시험이 표의 모든 갈래를 돈다.
 */

/** 질문 종류 — 추천 질문 칩 넷(FEATURE-006 FR-22) + 주문 요청 + 그 밖 */
export type CoachQuestionIntent =
  | "sell_check"
  | "weekly_amount"
  | "risk_check"
  | "mistake_review"
  | "order_request"
  | "other";

/** 칩으로 고를 수 있는 넷. 칩 문구는 화면이 갖고, 서버는 이 코드로만 받는다 */
export const COACH_QUESTION_CHIPS = ["sell_check", "weekly_amount", "risk_check", "mistake_review"] as const;
export type CoachQuestionChip = (typeof COACH_QUESTION_CHIPS)[number];

/**
 * 저장할 때 쓰는 칩 질문 문장 — 칩만 눌렀을 때 사용자 말풍선이 된다.
 * FEATURE-006 FR-22 의 "지금 팔아야 하나?" 는 검사기의 명령형(`-아야`)에 걸려 "지금 팔 때인가?" 로 바꿨다 — 칩은 코치 화면이 띄우는 문구다
 */
export const COACH_CHIP_QUESTION: Record<CoachQuestionChip, string> = {
  sell_check: "지금 팔 때인가?",
  weekly_amount: "이번 주 얼마 넣을까?",
  risk_check: "내 포트폴리오 위험한가?",
  mistake_review: "내가 뭘 잘못했나?",
};

// 순서가 규칙이다 — 앞 것이 이긴다. "손절을 잘못했나" 는 복기, "매수해 줘" 는 주문 요청(FR-29)
const ROUTES: ReadonlyArray<[CoachQuestionIntent, RegExp]> = [
  ["order_request", /(매수|매도|구매|주문)\s*(해\s*줘|해\s*주|넣어\s*줘|걸어\s*줘|부탁)|(사|팔아|사\s*다)\s*(줘|주세요|주라|줄래)|대신\s*(사|팔|주문)/],
  ["mistake_review", /잘못|실수|습관|복기|후회|뭘\s*틀|버릇/],
  ["risk_check", /위험|리스크|집중|쏠려|쏠림|낙폭|변동성|손실\s*한도|괜찮/],
  ["sell_check", /팔아|팔까|팔지|팔\s*때|매도|정리할|익절|손절|빼야|뺄까/],
  ["weekly_amount", /얼마|적립|넣을|넣어야|추가\s*매수|더\s*살/],
];

/**
 * 질문 분류 — 규칙만(FR-21). 칩이 있으면 칩이 이긴다. 못 고르면 `other`(최소 답, FR-22).
 * 분류에 LLM 을 쓰지 않는다 — 호출이 두 배가 되고 같은 질문이 다른 답으로 갈린다.
 */
export const routeCoachQuestion = (content: string, chip: CoachQuestionChip | null = null): CoachQuestionIntent => {
  if (chip) return chip;
  const text = content.normalize("NFC");
  for (const [intent, pattern] of ROUTES) {
    if (pattern.test(text)) return intent;
  }
  return "other";
};

/** 답 아래 붙는 화면 이동 — 코드만. 경로는 화면이 정한다 */
export type CoachAnswerLink = "risk_budget" | "profit_plan" | "behavior_mirror" | "size_check" | "symbol";

/** 답이 읽은 재료 중 못 읽은 것 — 그 문장 대신 "불러올 수 없어요"가 나가고 0 을 쓰지 않는다(FEATURE-006 FR-15) */
export type CoachAnswerGap = "risk" | "plans" | "behavior" | "recommendation";

export interface CoachAnswer {
  intent: CoachQuestionIntent;
  sentences: string[];
  links: Array<{ kind: CoachAnswerLink; symbol?: string }>;
  gaps: CoachAnswerGap[];
  /** 검사기가 뺀 문장 수(FR-46) — 0 이 아니면 틀이 잘못된 것이다 */
  dropped: number;
}

// ─── 재료 — 응용층이 이미 있는 유스케이스 결과에서 옮겨 담는다(숫자는 계산하지 않고 옮기기만) ───

export interface RiskAnswerFacts {
  totalValueKrw: Decimal;
  drawdown: {
    status: "ok" | "exceeded" | "budget_not_set" | "insufficient_data";
    budgetKrw: Decimal | null;
    usedKrw: Decimal | null;
  };
  concentration: {
    status: "ok" | "exceeded" | "budget_not_set" | "insufficient_data";
    topSymbol: string | null;
    topWeight: Decimal | null;
    limit: Decimal;
  };
  btcBeta: { status: string; btcEquivalentKrw: Decimal | null };
}

export interface SellPlanFacts {
  symbol: string;
  status: "take_profit_review" | "stop_loss_review" | "raise_stop_review" | "hold_plan";
  /** 퍼센트(12 = 12%) — 보유 · 익절/손절 계획이 쓰는 단위 그대로(`profitPlan` THRESHOLD 가 10 = 10%) */
  unrealizedProfitRate: number;
  currentPrice: number;
  /** 익절 · 손절 계획의 점검 가격들(`profitPlan` 이 낸 그대로) */
  stages: Array<{ label: string; price: number }>;
}

/** 지금가에서 가장 가까운 점검 가격 — 이름과 거리(비율, 지금가 대비). 지금가가 0 이거나 단계가 없으면 `null` */
export const nearestPlanStage = (plan: SellPlanFacts): { label: string; gap: number } | null => {
  if (!(plan.currentPrice > 0) || plan.stages.length === 0) return null;
  const gaps = plan.stages.map((stage) => ({
    label: stage.label,
    gap: new Decimal(stage.price).minus(plan.currentPrice).div(plan.currentPrice).toNumber(),
  }));
  return gaps.reduce((best, next) => (Math.abs(next.gap) < Math.abs(best.gap) ? next : best));
};

export interface BehaviorAnswerFacts {
  status: "insufficient_data" | "active" | "stable";
  transactionCount: number;
  minimumRequired: number | null;
  /** 행동 코치 경고 문장(이미 서버 문장) — 심한 것부터 */
  warnings: Array<{ title: string; message: string }>;
}

/**
 * 저장 추천 카드 요약(F006 2단계 · `SRV-REQ-028` FR-50~54) — 문장을 고르는 데만 쓴다. 카드 본문은 응용층이 게이트(`recommendationGate`)를
 * 지난 그대로 복사해 저장한다. 막힌 카드는 종목을 모른다(행동 · 종목 · 근거를 싣지 않는다 — `DB-REQ-022` FR-12)
 */
export interface RecommendationCardFacts {
  renderable: boolean;
  symbol: string | null;
  /** 판단을 만든 뒤 지난 시간 */
  staleHours: number;
}

export interface CoachAnswerFacts {
  /** `null` = 저장 추천이 아직 없다 · `undefined` = 읽지 않았다 */
  recommendation?: RecommendationCardFacts | null | "unavailable";
  risk: RiskAnswerFacts | null | undefined;
  plans: SellPlanFacts[] | null | undefined;
  behavior: BehaviorAnswerFacts | null | undefined;
  /** 한 번 거래 최대 손실(원) — 위험 예산 설정. 정하지 않았으면 `null` */
  perTradeMaxLossKrw: Decimal | null | undefined;
}

/** 어떤 질문이 어떤 재료를 읽는가(FR-20 — 필요한 것만). 응용층이 이 표대로만 부른다 */
export type CoachAnswerMaterial = "risk" | "plans" | "behavior" | "recommendation";
/**
 * 한 번 거래 손실 한도는 위험 예산 설정에서 오므로 `weekly_amount` 도 `risk` 를 읽는다.
 * 저장 추천 카드는 사고팔기를 묻는 둘에만 붙는다 — 위험 · 복기 답에 추천을 끼우면 묻지 않은 매매 얘기가 된다
 */
export const ANSWER_MATERIALS: Record<CoachQuestionIntent, readonly CoachAnswerMaterial[]> = {
  sell_check: ["plans", "recommendation"],
  weekly_amount: ["risk", "recommendation"],
  risk_check: ["risk"],
  mistake_review: ["behavior"],
  order_request: [],
  other: [],
};

// ─── 문장 틀 ───

const won = (value: Decimal): string =>
  `${value.toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber().toLocaleString("ko-KR")}원`;
const pct = (ratio: Decimal | number): string => `${new Decimal(ratio).times(100).toDecimalPlaces(1).toString()}%`;
/** 이미 퍼센트인 값(12 = 12%) */
const pctOf = (percent: number): string => `${new Decimal(percent).toDecimalPlaces(1).toString()}%`;
/** 조사는 읽는 소리로 — "500,000원을" · "BTC가" · "56.4%로"(`withJosa`) */
const j = withJosa;

const UNAVAILABLE = "지금 이 부분을 불러올 수 없어요. 잠시 뒤 다시 물어봐 주시면 같은 계산으로 답해요.";
const NOT_ORDER = "SALT는 주문을 내지 않아요 — 실제 매매는 쓰시는 거래소 · 증권사 앱에서 직접 하시게 돼요.";

const STATUS_LINE: Record<SellPlanFacts["status"], string> = {
  take_profit_review: "수익 구간이라 단계형 익절 검토 지점에 와 있어요",
  stop_loss_review: "손실 구간이라 손실 제한을 검토할 대상이에요",
  raise_stop_review: "수익이 붙어 손실 제한선을 올려 볼 구간이에요",
  hold_plan: "아직 계획 유지 구간이에요",
};

const sellAnswer = (plans: SellPlanFacts[] | null | undefined): Omit<CoachAnswer, "intent" | "dropped"> => {
  if (plans == null) return { sentences: [UNAVAILABLE], links: [], gaps: ["plans"] };
  if (plans.length === 0) {
    return {
      sentences: [
        "기록된 코인 보유가 없어서 팔지 말지를 볼 대상이 없어요.",
        "보유를 기록하면 종목마다 손실 제한 · 익절 검토 가격을 같이 보여 드려요.",
      ],
      links: [],
      gaps: [],
    };
  }
  // 검토가 필요한 것 먼저 — 손실 제한 · 익절 · 올리기 · 유지
  const order: SellPlanFacts["status"][] = ["stop_loss_review", "take_profit_review", "raise_stop_review", "hold_plan"];
  const sorted = [...plans].sort((a, b) => order.indexOf(a.status) - order.indexOf(b.status));
  const shown = sorted.slice(0, 3);
  const sentences = [
    `코인 보유 ${plans.length}개를 같은 규칙(평단 · 변동성 기준 점검 가격)으로 봤어요.`,
    ...shown.map((plan) => {
      const head = `${j(plan.symbol, "은/는")} 평가 손익 ${j(`${plan.unrealizedProfitRate >= 0 ? "+" : ""}${pctOf(plan.unrealizedProfitRate)}`, "으로/로")} ${STATUS_LINE[plan.status]}.`;
      const nearest = nearestPlanStage(plan);
      return nearest
        ? `${head} 가장 가까운 점검 가격(${nearest.label})까지 ${pct(Math.abs(nearest.gap))} 떨어져 있어요.`
        : head;
    }),
  ];
  if (plans.length > shown.length) sentences.push(`나머지 ${plans.length - shown.length}개는 계획 유지 쪽이 많아 익절 · 손절 계획 화면에 모아 뒀어요.`);
  sentences.push("점검 가격은 다시 들여다볼 지점일 뿐이에요 — 처음 산 이유가 아직 유효한지가 판단의 기준이에요.");
  return {
    sentences,
    links: [{ kind: "profit_plan" }, ...shown.slice(0, 1).map((plan) => ({ kind: "symbol" as const, symbol: plan.symbol }))],
    gaps: [],
  };
};

const riskAnswer = (risk: RiskAnswerFacts | null | undefined): Omit<CoachAnswer, "intent" | "dropped"> => {
  if (risk == null) return { sentences: [UNAVAILABLE], links: [], gaps: ["risk"] };
  if (risk.totalValueKrw.lte(0)) {
    return {
      sentences: ["기록된 보유가 없어 위험을 잴 대상이 없어요.", "보유를 기록하면 집중도 · 이번 달 손실 · BTC 민감도를 같이 재요."],
      links: [],
      gaps: [],
    };
  }
  const sentences = [`지금 평가금 ${won(risk.totalValueKrw)} 기준으로 세 가지를 봤어요.`];
  const c = risk.concentration;
  if (c.topSymbol && c.topWeight) {
    sentences.push(
      c.status === "exceeded"
        ? `한 종목 집중도: ${j(c.topSymbol, "이/가")} ${j(pct(c.topWeight), "으로/로")} 정해 둔 상한 ${j(pct(c.limit), "을/를")} 넘었어요.`
        : `한 종목 집중도: 가장 큰 ${j(c.topSymbol, "이/가")} ${j(pct(c.topWeight), "으로/로")} 상한 ${pct(c.limit)} 안이에요.`
    );
  }
  const d = risk.drawdown;
  if (d.status === "budget_not_set") {
    sentences.push("이번 달 손실 한도는 아직 정하지 않으셔서 한도 대비로는 잴 수 없어요.");
  } else if (d.status === "insufficient_data" || !d.budgetKrw || !d.usedKrw) {
    sentences.push("이번 달 손실은 일봉이 모자라 지금은 잴 수 없어요.");
  } else {
    sentences.push(
      d.status === "exceeded"
        ? `이번 달 손실: ${j(won(d.usedKrw), "으로/로")} 한도 ${j(won(d.budgetKrw), "을/를")} 넘었어요.`
        : `이번 달 손실: 한도 ${won(d.budgetKrw)} 중 ${j(won(d.usedKrw), "을/를")} 썼어요.`
    );
  }
  if (risk.btcBeta.status === "ok" && risk.btcBeta.btcEquivalentKrw) {
    sentences.push(
      `BTC 민감도: 보유 전체가 BTC ${won(risk.btcBeta.btcEquivalentKrw)}어치처럼 움직여요 — BTC가 10% 움직이면 대략 그 10% 만큼이에요.`
    );
  }
  const exceeded = [c.status, d.status].filter((status) => status === "exceeded").length;
  sentences.push(
    exceeded > 0
      ? `정해 둔 기준을 넘은 항목이 ${exceeded}개 있어요 — 그 기준을 정할 때의 이유가 지금도 맞는지가 볼 점이에요.`
      : "정해 둔 기준을 넘은 항목은 없어요."
  );
  return { sentences, links: [{ kind: "risk_budget" }], gaps: [] };
};

const mistakeAnswer = (behavior: BehaviorAnswerFacts | null | undefined): Omit<CoachAnswer, "intent" | "dropped"> => {
  if (behavior == null) return { sentences: [UNAVAILABLE], links: [], gaps: ["behavior"] };
  if (behavior.status === "insufficient_data") {
    const need = behavior.minimumRequired ?? 3;
    return {
      sentences: [
        `기록된 거래가 ${behavior.transactionCount}건이라 습관을 말하기엔 적어요(${need}건부터 봐요).`,
        "몇 건으로 패턴을 단정하면 틀린 말이 되기 쉬워요 — 거래를 기록할수록 이 답이 구체적이 돼요.",
      ],
      links: [],
      gaps: [],
    };
  }
  if (behavior.warnings.length === 0) {
    return {
      sentences: [
        `거래 ${behavior.transactionCount}건에서 반복해서 걸리는 습관은 찾지 못했어요.`,
        "결정마다 결과를 따로 보는 거울 화면에 손절 · 익절 습관과 기준 대비 성과가 있어요.",
      ],
      links: [{ kind: "behavior_mirror" }],
      gaps: [],
    };
  }
  const shown = behavior.warnings.slice(0, 2);
  return {
    sentences: [
      `거래 ${behavior.transactionCount}건에서 반복해서 보인 것 ${behavior.warnings.length}가지 중 먼저 볼 것이에요.`,
      ...shown.map((warning) => `${warning.title} — ${warning.message}`),
      "사람을 평가하는 게 아니라 기록된 거래에서 셀 수 있는 패턴이에요.",
    ],
    links: [{ kind: "behavior_mirror" }],
    gaps: [],
  };
};

const weeklyAnswer = (perTradeMaxLossKrw: Decimal | null | undefined): Omit<CoachAnswer, "intent" | "dropped"> => {
  const sentences = [
    "이번 주에 얼마를 넣을지 정해 주는 적립 계산(밸류에이션 밴드)은 아직 SALT에 없어요.",
  ];
  const gaps: CoachAnswerGap[] = [];
  if (perTradeMaxLossKrw === undefined) {
    gaps.push("risk");
  } else if (perTradeMaxLossKrw === null) {
    sentences.push("대신 한 번 거래에 감수할 손실 한도를 정해 두면, 사려는 종목마다 그 한도에 맞는 금액을 계산해 드려요.");
  } else {
    sentences.push(
      `정해 두신 한 번 거래 손실 한도가 ${won(perTradeMaxLossKrw)}이라서, 사려는 종목과 손절 가격을 넣으면 그 한도에 맞는 금액을 계산해 드려요.`
    );
  }
  return { sentences, links: [{ kind: "size_check" }], gaps };
};

const ORDER_ANSWER: Omit<CoachAnswer, "intent" | "dropped"> = {
  sentences: [NOT_ORDER, "대신 그 종목의 손실 제한 · 익절 검토 가격이나 한 번 거래 손실 한도에 맞는 금액은 여기서 같이 볼 수 있어요."],
  links: [{ kind: "size_check" }],
  gaps: [],
};

const OTHER_ANSWER: Omit<CoachAnswer, "intent" | "dropped"> = {
  sentences: [
    "이 대화는 지금 네 가지에 답해요 — 보유를 팔지 말지 · 이번 주 넣을 금액 · 포트폴리오 위험 · 지난 거래 복기.",
    "아래 질문 중 하나를 고르거나 같은 뜻으로 물으면 그 계산으로 답해요.",
  ],
  links: [],
  gaps: [],
};

/** 판단이 이만큼 오래되면 문장에 나이를 적는다 — 저장 추천의 만료(24시간)와 같다 */
export const CARD_STALE_NOTE_HOURS = 24;

/** 카드에 붙는 문장 한 줄 — 카드가 없으면(`null`) 문장도 없다. 못 읽었으면 그 사실만 */
export const cardSentence = (card: CoachAnswerFacts["recommendation"]): string | null => {
  if (card === undefined || card === null) return null;
  if (card === "unavailable") return "가장 최근 코치 판단은 지금 불러올 수 없어 카드 없이 답했어요.";
  const age = card.staleHours >= CARD_STALE_NOTE_HOURS ? ` 그 판단은 ${Math.floor(card.staleHours)}시간 전에 만든 거예요.` : "";
  return card.renderable && card.symbol
    ? `가장 최근 코치 판단(${card.symbol})을 아래 카드로 붙였어요 — 근거 · 과거 성적 · 틀렸던 때가 함께 있어요.${age}`
    : `가장 최근 코치 판단은 근거 · 과거 성적 · 틀렸던 때 중 빈 것이 있어 내용 대신 사유만 보여 드려요.${age}`;
};

/**
 * 규칙 답 — 재료를 받아 문장을 만든다. 숫자를 새로 계산하지 않는다(반올림 · 백분율 표기만).
 * 어느 문장이든 검사기에 걸리면 빼고 센다 — 남는 문장이 없으면 "불러올 수 없어요" 한 줄.
 */
export const composeCoachAnswer = (intent: CoachQuestionIntent, facts: CoachAnswerFacts): CoachAnswer => {
  const draft =
    intent === "sell_check"
      ? sellAnswer(facts.plans)
      : intent === "risk_check"
        ? riskAnswer(facts.risk)
        : intent === "mistake_review"
          ? mistakeAnswer(facts.behavior)
          : intent === "weekly_amount"
            ? weeklyAnswer(facts.perTradeMaxLossKrw)
            : intent === "order_request"
              ? ORDER_ANSWER
              : OTHER_ANSWER;
  const card = ANSWER_MATERIALS[intent].includes("recommendation") ? cardSentence(facts.recommendation) : null;
  const all = card ? [...draft.sentences, card] : draft.sentences;
  const gaps: CoachAnswerGap[] = facts.recommendation === "unavailable" && card ? [...draft.gaps, "recommendation"] : draft.gaps;
  const kept = all.filter((sentence) => languageViolations(sentence).length === 0);
  return {
    intent,
    sentences: kept.length ? kept : [UNAVAILABLE],
    links: draft.links,
    gaps,
    dropped: all.length - kept.length,
  };
};

// ─── 오늘의 브리핑 — 대화 첫 메시지(FEATURE-006 FR-21 · `FE-REQ-030` FR-31) ───

export interface CoachBriefingFacts {
  plans: SellPlanFacts[] | null;
  risk: RiskAnswerFacts | null;
  recommendation: RecommendationCardFacts | null | "unavailable";
}

export interface CoachBriefing {
  sentences: string[];
  links: CoachAnswer["links"];
  gaps: CoachAnswerGap[];
  dropped: number;
}

const BRIEFING_HEAD = "오늘의 브리핑이에요 — 보유 · 위험 · 코치 판단을 답과 같은 계산으로 모았어요.";
const BRIEFING_TAIL = "아래 질문 중 하나로 더 자세히 물어볼 수 있어요.";

/**
 * 브리핑 — 저장하지 않는 첫 메시지. 숫자는 답과 같은 재료에서 옮기고(새 계산 0), 빈 화면 대신 무엇을 물을지 보여 준다.
 * 재료 하나 실패 = 그 줄만 "불러올 수 없어요"(0 을 쓰지 않는다)
 */
export const composeCoachBriefing = (facts: CoachBriefingFacts): CoachBriefing => {
  const sentences = [BRIEFING_HEAD];
  const links: CoachAnswer["links"] = [];
  const gaps: CoachAnswerGap[] = [];

  if (facts.plans === null) {
    gaps.push("plans");
    sentences.push("코인 보유 점검은 지금 불러올 수 없어요.");
  } else if (facts.plans.length === 0) {
    sentences.push("기록된 코인 보유가 없어 점검 가격을 볼 대상이 없어요.");
  } else {
    const count = (status: SellPlanFacts["status"]) => facts.plans!.filter((plan) => plan.status === status).length;
    const parts = [
      ["손실 제한 검토", count("stop_loss_review")],
      ["익절 검토", count("take_profit_review")],
      ["손실 제한선 올리기", count("raise_stop_review")],
    ].filter(([, n]) => (n as number) > 0) as Array<[string, number]>;
    const review = parts.reduce((sum, [, n]) => sum + n, 0);
    if (review === 0) {
      sentences.push(`코인 보유 ${facts.plans.length}개 모두 아직 계획 유지 구간이에요.`);
    } else {
      sentences.push(
        `코인 보유 ${facts.plans.length}개 중 점검 지점에 온 것이 ${review}개예요(${parts.map(([label, n]) => `${label} ${n}`).join(" · ")}).`
      );
      links.push({ kind: "profit_plan" });
    }
  }

  if (facts.risk === null) {
    gaps.push("risk");
    sentences.push("위험 기준 점검은 지금 불러올 수 없어요.");
  } else if (facts.risk.totalValueKrw.gt(0)) {
    const exceeded = [facts.risk.concentration.status, facts.risk.drawdown.status].filter((status) => status === "exceeded").length;
    if (exceeded > 0) {
      sentences.push(`정해 둔 위험 기준을 넘은 항목이 ${exceeded}개 있어요.`);
      links.push({ kind: "risk_budget" });
    } else if (facts.risk.drawdown.status === "budget_not_set") {
      sentences.push("이번 달 손실 한도를 아직 정하지 않으셔서 한도 대비로는 잴 수 없어요.");
    } else {
      sentences.push("정해 둔 위험 기준을 넘은 항목은 없어요.");
    }
  }

  if (facts.recommendation === "unavailable") gaps.push("recommendation");
  const card = cardSentence(facts.recommendation);
  sentences.push(card ?? "아직 만든 코치 판단이 없어요 — 판단이 생기면 여기에 카드로 붙어요.");
  sentences.push(BRIEFING_TAIL);

  const kept = sentences.filter((sentence) => languageViolations(sentence).length === 0);
  return { sentences: kept, links, gaps, dropped: sentences.length - kept.length };
};

/** 대화 제목 — 첫 질문 앞 40자(FR-10). LLM 을 부르지 않는다 */
export const conversationTitle = (content: string): string => {
  const flat = content.replace(/\s+/g, " ").trim();
  return flat.length > 40 ? `${flat.slice(0, 39)}…` : flat;
};

/** 질문 길이 상한 — 프롬프트가 없어도 저장 · 화면이 무한히 길어지지 않게 */
export const COACH_QUESTION_MAX_LENGTH = 500;

/** 없는 대화 · 메시지, 또는 남의 것 — 둘을 가르지 않는다(남의 대화가 있다는 것도 알리지 않는다) */
export class CoachConversationNotFoundError extends DomainError {
  constructor() {
    super("COACH_CONVERSATION_NOT_FOUND", ErrorKind.NotFound, "Coach conversation not found");
  }
}
