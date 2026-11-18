import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareLedger,
  InsufficientQuantityError,
  TransactionNotFoundError,
  type HoldingRepository,
  type HoldingSnapshot,
  type KrStockQuoteSource,
  type LedgerEntry,
  type Transaction,
  type TransactionRepository,
} from "../../domain";
import { DeleteTransaction, PreviewTransaction, RecordTransaction, UpdateTransaction } from "../RecordTransaction";

/**
 * 원장 쓰기(F006 G절 2단계 · `DB-REQ-022` FR-71~74) — 메모리 원장 + **롤백하는 가짜 트랜잭션**.
 * 과매도로 던지면 쓴 거래 · 보유가 둘 다 앞 상태로 돌아가야 한다(쓰기와 보유가 갈라지지 않는다).
 */

const day = (d: number) => new Date(Date.UTC(2026, 10, d));

const world = () => {
  let rows: Transaction[] = [
    { id: "t1", userId: "u1", symbol: "BTC", assetType: "crypto", transactionType: "buy", quantity: 10, price: 100, totalAmount: 1_000, fee: 0, note: null, transactionDate: day(1) },
    { id: "t2", userId: "u1", symbol: "BTC", assetType: "crypto", transactionType: "sell", quantity: 4, price: 150, totalAmount: 600, fee: 0, note: null, transactionDate: day(5) },
    { id: "x1", userId: "u2", symbol: "BTC", assetType: "crypto", transactionType: "buy", quantity: 1, price: 100, totalAmount: 100, fee: 0, note: null, transactionDate: day(1) },
  ];
  let holding: { quantity: number } | null = { quantity: 6 };
  let seq = 0;
  const log: string[] = [];

  const transactions = {
    findOwned: async (userId: string, id: string) => rows.find((row) => row.id === id && row.userId === userId) ?? null,
    findLedger: async (userId: string, symbol: string, assetType: string): Promise<LedgerEntry[]> =>
      rows.filter((row) => row.userId === userId && row.symbol === symbol && row.assetType === assetType).sort(compareLedger),
    lockLedger: async (userId: string, symbol: string) => {
      log.push(`lock:${userId}:${symbol}`);
    },
    create: async (input: Omit<Transaction, "id" | "note"> & { note?: string }) => {
      const row = { ...input, id: `n${(seq += 1)}`, note: input.note ?? null };
      rows.push(row);
      return row;
    },
    update: async (id: string, patch: Partial<Transaction>) => {
      rows = rows.map((row) => (row.id === id ? { ...row, ...patch } : row));
      return rows.find((row) => row.id === id)!;
    },
    delete: async (id: string) => {
      rows = rows.filter((row) => row.id !== id);
    },
  } as unknown as TransactionRepository;

  const holdings = {
    save: async (_u: string, _s: string, _a: string, snapshot: HoldingSnapshot) => {
      holding = { quantity: snapshot.totalQuantity.toNumber() };
    },
    remove: async () => {
      holding = null;
    },
    findOne: async () => null,
  } as unknown as HoldingRepository;

  const krStock: KrStockQuoteSource = { assertTradable: async () => {}, prices: async () => [] };

  /** 롤백하는 트랜잭션 — 던지면 원장 · 보유를 앞 상태로 */
  const ledger = {
    run: async <T>(fn: () => Promise<T>) => {
      const saved = { rows: [...rows], holding };
      log.push("begin");
      try {
        const result = await fn();
        log.push("commit");
        return result;
      } catch (error) {
        rows = saved.rows;
        holding = saved.holding;
        log.push("rollback");
        throw error;
      }
    },
  };

  const deps = { transactions, holdings, krStock, ledger };
  return {
    deps,
    log,
    rows: () => rows,
    holding: () => holding,
    record: new RecordTransaction(deps),
    update: new UpdateTransaction(deps),
    remove: new DeleteTransaction(deps),
    preview: new PreviewTransaction(transactions),
  };
};

const sell = (quantity: number, d: number) => ({
  userId: "u1",
  symbol: "btc",
  transactionType: "sell" as const,
  quantity,
  price: 200,
  fee: 0,
  transactionDate: day(d),
});

describe("원장 쓰기 — 한 트랜잭션 · 과매도면 롤백", () => {
  it("받는 매도 — 잠금 → 커밋, 보유 6 → 1", async () => {
    const w = world();
    await w.record.execute(sell(5, 20));
    assert.deepEqual(w.log, ["begin", "lock:u1:BTC", "commit"]);
    assert.deepEqual(w.holding(), { quantity: 1 });
  });

  it("과거 날짜 매도(지금 보유 6 안이지만 그날 뒤 매도로 음수) — 거부 · 거래 0 · 보유 그대로", async () => {
    const w = world();
    await assert.rejects(w.record.execute(sell(7, 3)), InsufficientQuantityError);
    assert.equal(w.log.at(-1), "rollback");
    assert.equal(w.rows().length, 3);
    assert.deepEqual(w.holding(), { quantity: 6 });
  });

  it("매수 수량을 줄여 뒤 매도가 넘치면 거부", async () => {
    const w = world();
    await assert.rejects(w.update.execute("u1", "t1", { quantity: 3 }), InsufficientQuantityError);
    assert.equal(w.rows().find((row) => row.id === "t1")!.quantity, 10);
  });

  it("거래일 수정 — 매도를 매수 앞으로 옮기면 거부, 뒤로 옮기면 받는다", async () => {
    const w = world();
    await assert.rejects(w.update.execute("u1", "t2", { transactionDate: day(0) }), InsufficientQuantityError);
    await w.update.execute("u1", "t2", { transactionDate: day(9) });
    assert.deepEqual(w.rows().find((row) => row.id === "t2")!.transactionDate, day(9));
  });

  it("매수 삭제로 뒤 매도가 넘치면 거부 · 매도 삭제는 받는다(보유 10)", async () => {
    const w = world();
    await assert.rejects(w.remove.execute("u1", "t1"), InsufficientQuantityError);
    await w.remove.execute("u1", "t2");
    assert.deepEqual(w.holding(), { quantity: 10 });
  });

  it("전량 삭제면 보유 행을 지운다", async () => {
    const w = world();
    await w.remove.execute("u1", "t2");
    await w.remove.execute("u1", "t1");
    assert.equal(w.holding(), null);
  });

  it("남의 거래 id 로 수정 · 삭제 · 미리보기 — 없는 것과 같은 404, 트랜잭션을 열지 않는다", async () => {
    const w = world();
    await assert.rejects(w.update.execute("u1", "x1", { quantity: 2 }), TransactionNotFoundError);
    await assert.rejects(w.remove.execute("u1", "x1"), TransactionNotFoundError);
    await assert.rejects(w.preview.execute({ userId: "u1", kind: "update", transactionId: "x1", patch: {} }), TransactionNotFoundError);
    assert.deepEqual(w.log, []);
    assert.equal(w.rows().length, 3);
  });
});

describe("미리보기 — 쓰지 않는다 · 저장과 같은 답", () => {
  it("새 매도 미리보기는 원장 · 보유를 건드리지 않고, 같은 입력의 저장 결과와 수량이 같다", async () => {
    const w = world();
    const preview = await w.preview.execute({ userId: "u1", kind: "create", assetType: "crypto", ...sell(2, 20) });
    assert.equal(w.rows().length, 3);
    assert.deepEqual(w.log, []);
    assert.deepEqual(preview.before.quantity, 6);
    assert.deepEqual(preview.after.quantity, 4);

    await w.record.execute(sell(2, 20));
    assert.deepEqual(w.holding(), { quantity: preview.after.quantity });
  });

  it("과매도 미리보기는 저장과 같은 오류", async () => {
    const w = world();
    await assert.rejects(
      w.preview.execute({ userId: "u1", kind: "create", assetType: "crypto", ...sell(7, 3) }),
      InsufficientQuantityError,
    );
  });

  it("수정 미리보기 — 그 거래의 종목 원장에서 계산", async () => {
    const w = world();
    const preview = await w.preview.execute({ userId: "u1", kind: "update", transactionId: "t2", patch: { quantity: 1 } });
    assert.equal(preview.symbol, "BTC");
    assert.deepEqual([preview.before.quantity, preview.after.quantity], [6, 9]);
  });
});
