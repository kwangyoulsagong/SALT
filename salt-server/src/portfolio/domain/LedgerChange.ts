import Decimal from "decimal.js";

import { InsufficientQuantityError } from "./errors";
import { recalculateHolding, type HoldingSnapshot, type TransactionFact } from "./HoldingRecalculation";

/**
 * 거래 원장 한 종목의 변경 — 생성 · 수정 · 삭제를 **같은 규칙**으로 따진다(F006 G절 2단계 · `SRV-REQ-028` FR-85~87 · `DB-REQ-022` FR-70~73).
 *
 * 불변식 한 줄: **변경 뒤 원장을 거래일 순서로 걸었을 때 어느 시점에도 보유 수량이 음수가 아니다.**
 * 지금 보유만 보는 검사는 과거 날짜 매도(산 날보다 앞) · 과거 매수 수량 줄이기 · 매수 삭제를 통과시켰다.
 *
 * 미리보기와 저장이 이 파일의 같은 함수를 쓴다 — 미리보기는 메모리에서 바꿔 보고, 저장은 DB 에 쓴 뒤 다시 읽어 같은 검사를 한다.
 */

export interface LedgerEntry extends TransactionFact {
  id: string;
  transactionDate: Date;
}

export interface LedgerPatch {
  quantity?: number;
  price?: number;
  fee?: number;
  transactionDate?: Date;
}

export type LedgerChange =
  | { kind: "create"; entry: Omit<LedgerEntry, "id" | "totalAmount"> }
  | { kind: "update"; id: string; patch: LedgerPatch }
  | { kind: "delete"; id: string };

/** 아직 id 가 없는 새 거래 — 같은 시각 · 같은 방향 안에서 맨 뒤(먼저 적은 것이 먼저) */
const NEW_ENTRY_ID = "￿";

/**
 * 원장 순서 — 거래일 → **같은 시각이면 매수 먼저** → id. 같은 날 사고 판 기록이 "사기 전에 팔았다"가 되지 않게.
 * DB 조회(`findLedger`)도 같은 순서다(`transaction_date, transaction_type, id` — `buy` < `sell`)
 */
export const compareLedger = (a: LedgerEntry, b: LedgerEntry): number =>
  a.transactionDate.getTime() - b.transactionDate.getTime() ||
  (a.transactionType === b.transactionType ? 0 : a.transactionType === "buy" ? -1 : 1) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** 변경을 메모리에서 적용한 원장(정렬). 수정 · 삭제할 id 가 없으면 `null` — 호출부가 404 로 옮긴다 */
export const applyLedgerChange = (entries: LedgerEntry[], change: LedgerChange): LedgerEntry[] | null => {
  if (change.kind === "create") {
    const { entry } = change;
    return [...entries, { ...entry, id: NEW_ENTRY_ID, totalAmount: entry.quantity * entry.price }].sort(compareLedger);
  }
  if (!entries.some((entry) => entry.id === change.id)) return null;
  if (change.kind === "delete") return entries.filter((entry) => entry.id !== change.id);

  const { patch } = change;
  return entries
    .map((entry) => {
      if (entry.id !== change.id) return entry;
      const quantity = patch.quantity ?? entry.quantity;
      const price = patch.price ?? entry.price;
      return {
        ...entry,
        quantity,
        price,
        // 수량 · 단가를 안 바꾸면 저장된 총액을 그대로 — 저장(`UpdateTransaction`)과 같은 정의
        totalAmount: patch.quantity !== undefined || patch.price !== undefined ? quantity * price : entry.totalAmount,
        fee: patch.fee ?? entry.fee,
        transactionDate: patch.transactionDate ?? entry.transactionDate,
      };
    })
    .sort(compareLedger);
};

/** 원장을 순서대로 걸으며 본 가장 낮은 보유 수량. 음수면 그 시점에 가진 것보다 많이 팔았다 */
export const lowestRunningQuantity = (entries: LedgerEntry[]): Decimal => {
  let running = new Decimal(0);
  let lowest = new Decimal(0);
  for (const entry of entries) {
    running = entry.transactionType === "buy" ? running.plus(entry.quantity) : running.minus(entry.quantity);
    if (running.lt(lowest)) lowest = running;
  }
  return lowest;
};

/**
 * 변경 뒤 원장을 받아들일지.
 *
 * - 뒤 원장이 어느 시점에도 음수가 아니면 받는다
 * - **앞 원장이 이미 음수였으면**(옛 검사가 통과시킨 과거 날짜 매도) 더 나빠지지만 않으면 받는다 — 그 사람은 문제 기록을
 *   고치는 것 말고는 아무것도 못 적게 된다. 고치는 변경(음수 줄이기)과 상관없는 변경은 막지 않는다
 */
export const assertNotOversold = (before: LedgerEntry[], after: LedgerEntry[]): void => {
  const afterLowest = lowestRunningQuantity(after);
  if (afterLowest.gte(0)) return;
  if (afterLowest.gte(lowestRunningQuantity(before))) return;
  throw new InsufficientQuantityError();
};

export interface HoldingFigures {
  quantity: number;
  averageBuyPrice: number;
  totalInvested: number;
}

const toFigures = (snapshot: HoldingSnapshot): HoldingFigures =>
  snapshot.totalQuantity.gt(0)
    ? {
        quantity: snapshot.totalQuantity.toNumber(),
        averageBuyPrice: snapshot.averageBuyPrice.toNumber(),
        totalInvested: snapshot.totalInvested.toNumber(),
      }
    : // 보유 행을 지우는 상태(`shouldKeepHolding`)는 0 — 화면은 "보유 없음"으로 읽는다
      { quantity: 0, averageBuyPrice: 0, totalInvested: 0 };

export interface LedgerPreview {
  before: HoldingFigures;
  after: HoldingFigures;
}

/**
 * 미리보기 — 쓰지 않고 전후 수량 · 평단 · 총 취득금액(FR-85). 받아들일 수 없으면 저장과 같은 오류를 던진다.
 * 수정 · 삭제할 id 가 원장에 없으면 `null`
 */
export const previewLedgerChange = (entries: LedgerEntry[], change: LedgerChange): LedgerPreview | null => {
  const before = [...entries].sort(compareLedger);
  const after = applyLedgerChange(before, change);
  if (!after) return null;
  assertNotOversold(before, after);
  return { before: toFigures(recalculateHolding(before)), after: toFigures(recalculateHolding(after)) };
};
