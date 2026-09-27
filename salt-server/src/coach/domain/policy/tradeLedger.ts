/**
 * 거래 되감기 — FEATURE-009 슬라이스 4 (`SRV-REQ-038` FR-9)의 공통 재료.
 *
 * 준수 판정(`adherence`) · 결정 결과(`decisionOutcome`) · 미러(`mirror`)가 **같은 되감기 한 번**을 본다.
 * 셋이 각자 원가를 매기면 "준수 거래 평균 −4.4%"와 "태그 비용 합"이 서로 다른 원가에서 나온다.
 *
 * ## 원가는 FIFO — `portfolio` 의 보유 재계산과 같은 순서
 *
 * 매도는 가장 먼저 산 조각부터 소진한다(`portfolio/domain/HoldingRecalculation`). 다른 점 하나:
 * **매수 수수료를 조각 원가에 넣는다.** 결정 결과의 순수익은 "수수료 포함"(FR-14)이라서다.
 * 그래서 여기 순손익은 `portfolio` 의 `realizedProfit`(매수 수수료 제외)보다 매수 수수료만큼 작다.
 *
 * ## 매수 기록 없는 매도는 결과를 만들지 않는다
 *
 * `portfolio` 는 그 부분의 원가를 0 으로 본다(원문 동작). 여기서 그렇게 하면 매도 전액이 이익으로
 * 잡혀 미러가 조용히 좋아진다. 조각이 모자라는 매도는 `unmatchedSellIds` 로 따로 낸다.
 */

import Decimal from "decimal.js";

import type { CoachLedgerEntry } from "../model";

const ZERO = new Decimal(0);
/** 되감기 찌꺼기. 이보다 작은 잔량은 다 판 것으로 본다 */
const QUANTITY_EPSILON = new Decimal("1e-9");
const HOUR_MS = 60 * 60 * 1000;
/** 복수 매매 후보: 손실 청산 뒤 이 시간 안에 같은 종목 재진입 (FR-18) */
export const REVENGE_WINDOW_MS = 24 * HOUR_MS;

/** 매도 한 건이 소진한 매수 조각 하나 */
export interface ConsumedPiece {
  buyTransactionId: string;
  boughtAt: Date;
  quantity: Decimal;
  /** 이 조각의 원가(원) — 단가 × 수량 + 매수 수수료 비례분 */
  costKrw: Decimal;
  /** 매수 수수료 비례분(원) */
  buyFeeKrw: Decimal;
}

/** 매도 한 건의 되감기 결과 */
export interface ClosingTrace {
  sell: CoachLedgerEntry;
  pieces: ConsumedPiece[];
  /** 조각 원가 합 */
  costKrw: Decimal;
  /** 매도 대금 − 매도 수수료 */
  proceedsKrw: Decimal;
  netPnlKrw: Decimal;
}

/** 매수 한 건의 흔적 — 준수 판정은 매수 단위다 */
export interface LotTrace {
  buy: CoachLedgerEntry;
  /** 이 매수의 조각을 소진한 매도들(시간순) */
  consumedBy: Array<{ sellTransactionId: string; price: Decimal; at: Date; quantity: Decimal }>;
  /** 조각이 다 소진된 시각. 아직 남아 있으면 `null` */
  closedAt: Date | null;
  /** 매수 순간 이미 같은 종목을 들고 있었고, 그 평단(수수료 포함)보다 싸게 샀다 */
  averagingDown: boolean;
  /** 같은 종목 손실 청산 뒤 24시간 안의 매수 */
  revenge: boolean;
}

/** 매도 순간 들고 있던 종목과 그 평단 — 처분효과(PGR/PLR)의 장부상 이익 · 손실 판정 재료 */
export interface SellMoment {
  sellTransactionId: string;
  symbol: string;
  at: Date;
  /** 이 매도가 이익 실현인가(순손익 > 0) */
  realizedGain: boolean;
  /** 매도 **뒤** 남은 다른 종목들의 평단(원/단위, 수수료 포함) */
  otherHoldings: Array<{ symbol: string; unitCost: Decimal }>;
}

export interface LedgerReplay {
  closings: ClosingTrace[];
  lots: Map<string, LotTrace>;
  sellMoments: SellMoment[];
  /** 매수 기록이 모자라 원가를 모르는 매도 */
  unmatchedSellIds: string[];
  /** 지금 남은 수량(종목별) */
  openQuantities: Map<string, Decimal>;
}

interface OpenPiece {
  buyTransactionId: string;
  boughtAt: Date;
  quantity: Decimal;
  unitCost: Decimal;
  unitFee: Decimal;
}

const unitCostOf = (queue: OpenPiece[]): Decimal | null => {
  const quantity = queue.reduce((sum, piece) => sum.plus(piece.quantity), ZERO);
  if (quantity.lte(QUANTITY_EPSILON)) return null;
  const cost = queue.reduce((sum, piece) => sum.plus(piece.quantity.times(piece.unitCost)), ZERO);
  return cost.div(quantity);
};

/**
 * 거래(**시간 오름차순**)를 되감는다. 순서가 계약이다 — FIFO 는 입력 순서가 소진 순서다.
 * 같은 시각이면 입력 순서를 그대로 쓴다(정렬은 호출부 책임, `sortLedgerAscending`).
 */
export const replayLedger = (entries: CoachLedgerEntry[]): LedgerReplay => {
  const queues = new Map<string, OpenPiece[]>();
  const lots = new Map<string, LotTrace>();
  const closings: ClosingTrace[] = [];
  const sellMoments: SellMoment[] = [];
  const unmatchedSellIds: string[] = [];
  const lastLossCloseAt = new Map<string, Date>();

  for (const entry of entries) {
    const symbol = entry.symbol.toUpperCase();
    const queue = queues.get(symbol) ?? [];
    queues.set(symbol, queue);
    const quantity = new Decimal(entry.quantity);
    if (quantity.lte(0)) continue;

    if (entry.side === "buy") {
      const currentUnitCost = unitCostOf(queue);
      const unitFee = new Decimal(entry.fee).div(quantity);
      const unitCost = new Decimal(entry.totalAmount).div(quantity).plus(unitFee);
      const lossAt = lastLossCloseAt.get(symbol);
      lots.set(entry.id, {
        buy: entry,
        consumedBy: [],
        closedAt: null,
        averagingDown: currentUnitCost !== null && unitCost.lt(currentUnitCost),
        revenge:
          lossAt !== undefined &&
          entry.transactionDate.getTime() - lossAt.getTime() <= REVENGE_WINDOW_MS &&
          entry.transactionDate >= lossAt,
      });
      queue.push({
        buyTransactionId: entry.id,
        boughtAt: entry.transactionDate,
        quantity,
        unitCost,
        unitFee,
      });
      continue;
    }

    const available = queue.reduce((sum, piece) => sum.plus(piece.quantity), ZERO);
    if (available.plus(QUANTITY_EPSILON).lt(quantity)) {
      // 원가를 모른다. 남은 조각은 이 매도로 나간 것으로 보고 비운다 — 뒤 매도가 엉뚱한 원가를 쓰지 않게
      unmatchedSellIds.push(entry.id);
      for (const piece of queue) {
        const lot = lots.get(piece.buyTransactionId);
        if (lot) lot.closedAt = entry.transactionDate;
      }
      queue.length = 0;
      continue;
    }

    const pieces: ConsumedPiece[] = [];
    let remaining = quantity;
    while (remaining.gt(QUANTITY_EPSILON) && queue.length > 0) {
      const head = queue[0];
      const taken = Decimal.min(remaining, head.quantity);
      pieces.push({
        buyTransactionId: head.buyTransactionId,
        boughtAt: head.boughtAt,
        quantity: taken,
        costKrw: taken.times(head.unitCost),
        buyFeeKrw: taken.times(head.unitFee),
      });
      const lot = lots.get(head.buyTransactionId);
      lot?.consumedBy.push({
        sellTransactionId: entry.id,
        price: new Decimal(entry.price),
        at: entry.transactionDate,
        quantity: taken,
      });
      head.quantity = head.quantity.minus(taken);
      remaining = remaining.minus(taken);
      if (head.quantity.lte(QUANTITY_EPSILON)) {
        queue.shift();
        if (lot) lot.closedAt = entry.transactionDate;
      }
    }

    const costKrw = pieces.reduce((sum, piece) => sum.plus(piece.costKrw), ZERO);
    const proceedsKrw = new Decimal(entry.totalAmount).minus(entry.fee);
    const netPnlKrw = proceedsKrw.minus(costKrw);
    closings.push({ sell: entry, pieces, costKrw, proceedsKrw, netPnlKrw });
    if (netPnlKrw.isNegative()) lastLossCloseAt.set(symbol, entry.transactionDate);

    const otherHoldings: SellMoment["otherHoldings"] = [];
    for (const [other, otherQueue] of queues) {
      if (other === symbol) continue;
      const unitCost = unitCostOf(otherQueue);
      if (unitCost) otherHoldings.push({ symbol: other, unitCost });
    }
    sellMoments.push({
      sellTransactionId: entry.id,
      symbol,
      at: entry.transactionDate,
      realizedGain: netPnlKrw.gt(0),
      otherHoldings,
    });
  }

  const openQuantities = new Map<string, Decimal>();
  for (const [symbol, queue] of queues) {
    const quantity = queue.reduce((sum, piece) => sum.plus(piece.quantity), ZERO);
    if (quantity.gt(QUANTITY_EPSILON)) openQuantities.set(symbol, quantity);
  }

  return { closings, lots, sellMoments, unmatchedSellIds, openQuantities };
};

/** 시간 오름차순. 같은 시각이면 매수가 먼저다 — 같은 순간 사고판 기록이 "매수 없는 매도"가 되지 않게 */
export const sortLedgerAscending = (entries: CoachLedgerEntry[]): CoachLedgerEntry[] =>
  [...entries].sort((a, b) => {
    const diff = a.transactionDate.getTime() - b.transactionDate.getTime();
    if (diff !== 0) return diff;
    if (a.side !== b.side) return a.side === "buy" ? -1 : 1;
    return 0;
  });
