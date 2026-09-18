import Decimal from "decimal.js";

/**
 * 보유 재계산 (FIFO) — 이 컨텍스트의 **핵심 계산**이다.
 *
 * 원문(`portfolio.service.ts`)에서는 `private updateHolding()` 안에 Prisma 조회와
 * 저장 사이에 끼어 있었다. 그래서 **DB 없이는 단 한 줄도 확인할 수 없었고**, 실제로
 * 이 레포의 DB 가 비어 있어 아무도 확인한 적이 없다(체크리스트 §5).
 *
 * ## `number` 를 쓰지 않는다 — 그런데 `Money` 도 아니다
 *
 * `Decimal` 로 계산한다. 이유는 **누적**이다 — 거래 수천 건을 도는 루프에서 `Float`
 * 오차가 쌓이면 평균 매수가가 틀어지고, 그 값이 청구서·세금의 입력이 된다.
 *
 * 그런데 `Money`·`Quantity` VO 를 쓰지 않았다. 둘은 **음수를 금지**하는데(그게 그 VO 의
 * 가치다) 이 데이터 모델은 음수 중간값을 만든다:
 *
 * - `updateTransaction` 이 과거 매수 수량을 줄이면 잔량이 음수가 될 수 있다
 * - 매도 원가를 빼면서 `totalInvested` 가 음수가 될 수 있다 (원문 동작)
 *
 * VO 를 쓰면 그 경우에 **예외가 나고 보유가 갱신되지 않는다** — 원문은 음수 수량을
 * 0 이하로 보고 보유 행을 지웠다. 그건 이관이 아니라 정책 변경이다.
 *
 * > **`Money` 로 바꾸는 조건은 원장이 음수를 만들지 않게 되는 것**이고, 그건 `ledger`
 * > 컨텍스트(F001 · `SRV-REQ-012`~`015`)가 거래를 불변 원장으로 다루면서 성립한다.
 * > 컬럼의 `Float` → `Decimal` 승격은 `DB-REQ-007` 이다.
 */

/** 재계산 입력. Aggregate 가 아니라 **거래 사실**만 받는다. */
export interface TransactionFact {
  transactionType: "buy" | "sell";
  quantity: number;
  price: number;
  totalAmount: number;
  fee: number;
}

export interface HoldingSnapshot {
  totalQuantity: Decimal;
  totalInvested: Decimal;
  realizedProfit: Decimal;
  averageBuyPrice: Decimal;
}

/** FIFO 매수 큐의 한 칸. 소진되면 큐에서 빠진다. */
interface BuyLot {
  quantity: Decimal;
  price: Decimal;
}

const ZERO = new Decimal(0);

/**
 * 거래 내역(**거래일 오름차순**)에서 보유 상태를 만든다.
 *
 * 순서가 계약이다 — FIFO 는 입력 순서가 곧 원가 소진 순서이고, 정렬되지 않은 입력을
 * 주면 조용히 다른 답이 나온다. 정렬은 조회하는 쪽(`infrastructure`)이 보장한다.
 */
export const recalculateHolding = (
  transactions: TransactionFact[]
): HoldingSnapshot => {
  let totalQuantity = ZERO;
  let totalInvested = ZERO;
  let realizedProfit = ZERO;

  const buyQueue: BuyLot[] = [];

  for (const tx of transactions) {
    const quantity = new Decimal(tx.quantity);
    const price = new Decimal(tx.price);
    const totalAmount = new Decimal(tx.totalAmount);
    const fee = new Decimal(tx.fee);

    if (tx.transactionType === "buy") {
      totalQuantity = totalQuantity.plus(quantity);
      // 매수 원가에 수수료를 포함한다 (원문)
      totalInvested = totalInvested.plus(totalAmount).plus(fee);
      buyQueue.push({ quantity, price });
      continue;
    }

    totalQuantity = totalQuantity.minus(quantity);

    const costBasis = consumeFifo(buyQueue, quantity);

    // 실현 손익 = 매도금액 - 원가 - 수수료 (원문)
    realizedProfit = realizedProfit.plus(totalAmount).minus(costBasis).minus(fee);
    totalInvested = totalInvested.minus(costBasis);
  }

  return {
    totalQuantity,
    totalInvested,
    realizedProfit,
    /**
     * 수량이 0 이하면 0 이다. 원문은 `totalQuantity > 0` 만 검사했고, 음수 수량에서
     * 평균가를 내면 **부호가 뒤집힌 값**이 나온다.
     */
    averageBuyPrice: totalQuantity.gt(ZERO)
      ? totalInvested.div(totalQuantity)
      : ZERO,
  };
};

/**
 * 매수 큐에서 `quantity` 만큼 소진하고 그 원가를 준다.
 *
 * 큐가 먼저 비면 **남은 수량의 원가를 0 으로 본다** — 원문 동작이다. 매수 기록 없이
 * 매도가 들어온 경우(원장 import 이전 이력)에 그 매도 전액이 실현 이익이 된다.
 * 사실과 다를 수 있고, 그것을 드러내는 것은 `invoice` 의 원장 건강도(F001)가 한다.
 */
const consumeFifo = (buyQueue: BuyLot[], quantity: Decimal): Decimal => {
  let remaining = quantity;
  let costBasis = ZERO;

  while (remaining.gt(ZERO) && buyQueue.length > 0) {
    const lot = buyQueue[0];
    const taken = Decimal.min(remaining, lot.quantity);

    costBasis = costBasis.plus(taken.times(lot.price));
    remaining = remaining.minus(taken);
    lot.quantity = lot.quantity.minus(taken);

    if (lot.quantity.lte(ZERO)) buyQueue.shift();
  }

  return costBasis;
};

/** 보유 행을 남길지. 수량이 0 이하면 지운다 (원문). */
export const shouldKeepHolding = (snapshot: HoldingSnapshot): boolean =>
  snapshot.totalQuantity.gt(ZERO);
