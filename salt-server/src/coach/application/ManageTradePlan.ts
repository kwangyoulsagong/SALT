import type Decimal from "decimal.js";

import {
  lockedFieldChanges,
  LOCKED_AFTER_EXECUTION,
  TradePlanAlreadyLinkedError,
  TradePlanLockedError,
  TradePlanNotFoundError,
  TradePlanTransactionMismatchError,
  type PortfolioProbe,
  type TradePlan,
  type TradePlanPatch,
  type TradePlanSide,
  type TradePlanStore,
} from "../domain";

/**
 * 거래 계획 쓰기 · 읽기 — FEATURE-009 FR-9~10 (`SRV-REQ-038`).
 *
 * 판정 · 잠금 규칙은 `domain/policy/tradePlan` 에 있고 여기는 순서만 잡는다.
 * 계획은 지우지 않는다(W06 — 이전 판단을 다시 쓰지 않는다). 잘못 적었으면 새로 적는다.
 */

export interface CreateTradePlanCommand {
  symbol: string;
  side: TradePlanSide;
  transactionId?: string;
  stopPrice?: Decimal;
  targetPrice?: Decimal;
  plannedQuantity?: Decimal;
  thesis?: string;
  invalidation?: string;
  reviewAt?: Date;
  probabilityUp?: Decimal;
}

export type UpdateTradePlanCommand = TradePlanPatch;

/** 연결하려는 거래가 내 것 · 같은 종목 · 같은 방향인지 */
const assertLinkable = async (
  portfolio: PortfolioProbe,
  userId: string,
  transactionId: string,
  plan: { symbol: string; side: TradePlanSide }
): Promise<void> => {
  const entry = await portfolio.findLedgerEntry(userId, transactionId);
  if (!entry) throw new TradePlanTransactionMismatchError("not_found");
  if (entry.symbol.toUpperCase() !== plan.symbol) throw new TradePlanTransactionMismatchError("symbol");
  if (entry.side !== plan.side) throw new TradePlanTransactionMismatchError("side");
};

export class CreateTradePlan {
  constructor(
    private readonly plans: TradePlanStore,
    private readonly portfolio: PortfolioProbe,
    private readonly now: () => Date = () => new Date()
  ) {}

  async execute(userId: string, command: CreateTradePlanCommand): Promise<TradePlan> {
    const symbol = command.symbol.toUpperCase();
    if (command.transactionId) {
      await assertLinkable(this.portfolio, userId, command.transactionId, {
        symbol,
        side: command.side,
      });
    }

    return this.plans.create({
      userId,
      transactionId: command.transactionId ?? null,
      symbol,
      side: command.side,
      stopPrice: command.stopPrice ?? null,
      targetPrice: command.targetPrice ?? null,
      plannedQuantity: command.plannedQuantity ?? null,
      thesis: command.thesis ?? null,
      invalidation: command.invalidation ?? null,
      reviewAt: command.reviewAt ?? null,
      probabilityUp: command.probabilityUp ?? null,
      plannedAt: this.now(),
      // 사용자가 앱에서 직접 적은 계획이다. 시드 · 백테스트 경로는 이 유스케이스를 부르지 않는다
      sampleOrigin: "live",
    });
  }
}

export class UpdateTradePlan {
  constructor(
    private readonly plans: TradePlanStore,
    private readonly portfolio: PortfolioProbe
  ) {}

  async execute(
    userId: string,
    planId: string,
    patch: UpdateTradePlanCommand
  ): Promise<TradePlan> {
    const plan = await this.plans.findOwned(userId, planId);
    if (!plan) throw new TradePlanNotFoundError();

    const linking = patch.transactionId !== undefined && patch.transactionId !== plan.transactionId;
    if (linking && plan.transactionId !== null) throw new TradePlanAlreadyLinkedError();
    if (linking && patch.transactionId) {
      await assertLinkable(this.portfolio, userId, patch.transactionId, plan);
    }

    const locked = lockedFieldChanges(plan, patch);
    if (locked.length) throw new TradePlanLockedError(locked);

    // 잠긴 필드를 건드리거나 연결하는 수정이면 "아직 미연결"을 쓰기 조건으로 건다
    const touchesLocked = LOCKED_AFTER_EXECUTION.some((field) => patch[field] !== undefined);
    const updated = await this.plans.update(userId, planId, patch, {
      requireUnlinked: linking || (touchesLocked && plan.transactionId === null),
    });
    if (updated) return updated;

    // 조건에 걸렸다 — 그 사이 다른 요청이 연결했다
    const fresh = await this.plans.findOwned(userId, planId);
    if (!fresh) throw new TradePlanNotFoundError();
    if (linking) throw new TradePlanAlreadyLinkedError();
    const nowLocked = lockedFieldChanges(fresh, patch);
    if (nowLocked.length) throw new TradePlanLockedError(nowLocked);
    // 잠긴 필드를 같은 값으로 다시 보낸 경우 — 바꾸는 것이 없으니 조건 없이 쓴다
    const retried = await this.plans.update(userId, planId, patch, { requireUnlinked: false });
    if (!retried) throw new TradePlanNotFoundError();
    return retried;
  }
}

/** 한 번에 읽는 계획 수 상한. 종목 상세 카드는 최근 몇 건만 본다 */
export const TRADE_PLAN_LIST_MAX = 100;

export class ListTradePlans {
  constructor(private readonly plans: TradePlanStore) {}

  execute(userId: string, query: { symbol?: string; limit: number }): Promise<TradePlan[]> {
    return this.plans.listOwned(userId, {
      symbol: query.symbol?.toUpperCase(),
      limit: Math.min(query.limit, TRADE_PLAN_LIST_MAX),
    });
  }
}
