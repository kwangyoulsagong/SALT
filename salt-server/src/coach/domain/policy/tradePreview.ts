/**
 * 거래 입력 중 미리보기 — FEATURE-009 FR-19(엣지 없음 한 줄) · 시나리오 5(매도 프레이밍) (`SRV-REQ-038` FR-12).
 *
 * **차단이 아니다.** 입력 폼 아래 한 줄로 보일 재료만 만든다. 저장하지 않는다 — 판정은 배치(FR-9)가 한다
 * (2026-09-27 사용자 결정: 추격 판정을 입력 시점에 저장하지 않는다).
 *
 * ## 배치와 같은 규칙을 쓴다
 *
 * 물타기 · 복수는 가상의 매수 한 건을 장부 끝에 붙여 `replayLedger` 를 다시 돌려 얻는다 — 규칙을 두 벌 두면
 * 폼이 "물타기"라고 한 거래를 배치가 아니라고 한다. 추격은 `isChasing`, 계획 외는 "계획 없음" 그대로다.
 */

import Decimal from "decimal.js";

import { isChasing, type AutoMistakeTag } from "./decisionOutcome";
import type { TagCost } from "./mirror";
import { replayLedger, sortLedgerAscending, type LedgerReplay } from "./tradeLedger";
import type { TradePlan } from "./tradePlan";
import type { CoachLedgerEntry } from "../model";

const PREVIEW_ID = "__preview__";

export interface BuyTagPreviewInput {
  entries: CoachLedgerEntry[];
  symbol: string;
  quantity: Decimal;
  price: Decimal;
  /** 편도 수수료(원). 평단 비교가 배치와 같게 수수료를 넣는다 */
  fee: Decimal;
  at: Date;
  /** 매수 전 48시간 5분봉 최고 종가. 모르면 추격을 판정하지 않는다 */
  highBefore: Decimal | null;
  /** 폼에 계획(손절가 또는 이유)이 있는가 */
  hasPlan: boolean;
}

export interface BuyTagPreview {
  tags: AutoMistakeTag[];
  /** 5분봉이 없어 추격을 못 가렸다 */
  chasingUnknown: boolean;
}

/** 이 매수가 저장된다면 배치가 붙일 자동 태그 후보 */
export const previewBuyTags = (input: BuyTagPreviewInput): BuyTagPreview => {
  const symbol = input.symbol.toUpperCase();
  const draft: CoachLedgerEntry = {
    id: PREVIEW_ID,
    symbol,
    side: "buy",
    quantity: input.quantity.toNumber(),
    price: input.price.toNumber(),
    totalAmount: input.quantity.times(input.price).toNumber(),
    fee: input.fee.toNumber(),
    transactionDate: input.at,
  };
  const lot = replayLedger(sortLedgerAscending([...input.entries, draft])).lots.get(PREVIEW_ID);

  const tags: AutoMistakeTag[] = [];
  if (input.highBefore !== null && isChasing(input.price, input.highBefore)) tags.push("chasing");
  if (lot?.averagingDown) tags.push("averaging_down");
  if (lot?.revenge) tags.push("revenge");
  if (!input.hasPlan) tags.push("off_plan");
  return { tags, chasingUnknown: input.highBefore === null };
};

/**
 * 후보 태그 중 **엣지 없음**(표본 ≥ 20 · 기대값 음수, `tagCosts.noEdge`)인 것만. 배지를 보일지는 서버가 정한다 —
 * 화면은 받은 것을 그대로 한 줄씩 쓴다.
 */
export const edgeWarningsFor = (tags: string[], costs: TagCost[]): TagCost[] =>
  costs.filter((cost) => cost.noEdge && tags.includes(cost.tag));

export interface SellFraming {
  /** 지금 들고 있는 매수에 연결된 가장 최근 계획의 손절가. 없으면 `null` */
  planId: string | null;
  stopPrice: Decimal | null;
  currentPrice: Decimal | null;
}

/**
 * 매도 프레이밍 재료 — "오늘 처음 본다면" 한 줄 옆에 **계획 손절 vs 지금**.
 *
 * 매입가 · 손익률은 싣지 않는다(FR-27 매입가 숨김과 같은 방향 — 미래를 보게 한다). 계획은 **아직 남은 매수**에
 * 연결된 것만 본다 — 이미 다 판 포지션의 옛 손절가를 지금 포지션의 기준처럼 보이지 않게.
 */
export const sellFramingFor = (
  symbol: string,
  replay: LedgerReplay,
  plans: Array<Pick<TradePlan, "id" | "transactionId" | "side" | "stopPrice" | "createdAt">>,
  currentPrice: Decimal | null
): SellFraming => {
  const upper = symbol.toUpperCase();
  const openBuys = new Set(
    [...replay.lots.values()]
      .filter((lot) => lot.closedAt === null && lot.buy.symbol.toUpperCase() === upper)
      .map((lot) => lot.buy.id)
  );
  const plan =
    plans
      .filter(
        (candidate) =>
          candidate.side === "buy" &&
          candidate.stopPrice !== null &&
          candidate.transactionId !== null &&
          openBuys.has(candidate.transactionId)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

  return { planId: plan?.id ?? null, stopPrice: plan?.stopPrice ?? null, currentPrice };
};
