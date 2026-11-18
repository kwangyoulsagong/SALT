import {
  assertNotOversold,
  previewLedgerChange,
  recalculateHolding,
  revalue,
  shouldKeepHolding,
  TransactionNotFoundError,
  type HoldingRepository,
  type KrStockQuoteSource,
  type LedgerChange,
  type LedgerEntry,
  type LedgerTransaction,
  type PortfolioAssetType,
  type TransactionRepository,
} from "../domain";

/** 거래 입력이 받는 자산군(F011 슬라이스 3b). 주지 않으면 `crypto` — 기존 호출이 그대로 돈다 */
export type RecordableAssetType = Extract<PortfolioAssetType, "crypto" | "kr_stock">;

interface LedgerDeps {
  transactions: TransactionRepository;
  holdings: HoldingRepository;
  krStock: KrStockQuoteSource;
  ledger: LedgerTransaction;
}

/**
 * 원장 쓰기 한 번 — 생성 · 수정 · 삭제 셋이 **같은 순서**로 지난다(`DB-REQ-022` FR-71~73 · `SRV-REQ-028` FR-86).
 *
 * 한 트랜잭션: 종목 원장 잠금 → 앞 원장 읽기 → 쓰기 → 뒤 원장 읽기 → 과매도 검사(어느 시점이든 음수면 던져 **롤백**) → 보유 재계산 저장.
 * 쓴 뒤 다시 읽어 검사하므로 저장 순서(DB `id`)가 미리보기의 가상 순서와 달라도 저장되는 것은 DB 의 사실이다.
 * 국내 주식 평가(시세 읽기)는 커밋 뒤 — 트랜잭션 안에 외부 일을 넣지 않는다.
 *
 * > 옛 주석은 "재계산이 거래 전체를 읽어 감싸면 트랜잭션이 길어진다"며 감싸지 않았다. 수기 입력이라 종목당 수백 건 이하이고
 * > (`DB-REQ-022` 위험 메모) 감싸지 않으면 쓰기와 보유가 갈라지는 틈 · 동시 매도 둘이 서로를 통과하는 틈이 남는다 — 그래서 감쌌다
 */
const writeLedger = async <T>(
  deps: LedgerDeps,
  target: { userId: string; symbol: string; assetType: PortfolioAssetType },
  write: () => Promise<T>,
): Promise<T> => {
  const { userId, symbol, assetType } = target;
  const result = await deps.ledger.run(async () => {
    await deps.transactions.lockLedger(userId, symbol, assetType);
    const before = await deps.transactions.findLedger(userId, symbol, assetType);
    const written = await write();
    const after = await deps.transactions.findLedger(userId, symbol, assetType);
    assertNotOversold(before, after);

    const snapshot = recalculateHolding(after);
    if (shouldKeepHolding(snapshot)) await deps.holdings.save(userId, symbol, assetType, snapshot);
    else await deps.holdings.remove(userId, symbol, assetType);
    return written;
  });

  /**
   * 국내 주식은 저장된 현재가로 **바로** 평가한다. 코인은 BFF 가 5초 안에 밀어 넣지만 국내 주식 평가는
   * 시세 회차(장중 1분 · 밤엔 없음)를 기다려야 해서, 밤에 기록한 보유가 아침까지 평가액 0 으로 남는다
   */
  if (assetType === "kr_stock") {
    const [price] = await deps.krStock.prices([symbol]);
    const holding = price && (await deps.holdings.findOne(userId, symbol, assetType));
    if (price && holding) await deps.holdings.applyValuation(holding.id, revalue(holding, price.currentPrice));
  }
  return result;
};

export interface RecordTransactionCommand {
  userId: string;
  assetType?: RecordableAssetType;
  symbol: string;
  transactionType: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  note?: string;
  transactionDate?: Date;
}

/** 거래 기록 — 원장 쓰기(`writeLedger`) 한 번. 코치 기록 폼(F009)과 포지션 거래 시트(F006 G절)가 같은 경로 */
export class RecordTransaction {
  constructor(private readonly deps: LedgerDeps) {}

  async execute(command: RecordTransactionCommand) {
    const symbol = command.symbol.toUpperCase();
    const assetType = command.assetType ?? "crypto";

    /**
     * 국내 주식은 마스터에 있는 6자리 코드만 — 오타 코드가 보유로 남으면 평가 · 유니버스가 없는 종목을 쫓는다.
     * 단가가 호가 단위 배수가 아니어도 **막지 않는다**(수동 입력 원칙, FR-42 — 안내는 화면 몫). 트랜잭션 밖
     */
    if (assetType === "kr_stock") await this.deps.krStock.assertTradable(symbol);

    // 보유를 넘는 매도는 지금 보유가 아니라 **그 거래일 시점**으로 따진다 — 원장 쓰기가 롤백한다
    return writeLedger(this.deps, { userId: command.userId, symbol, assetType }, () =>
      this.deps.transactions.create({
        userId: command.userId,
        symbol,
        assetType,
        transactionType: command.transactionType,
        quantity: command.quantity,
        price: command.price,
        totalAmount: command.quantity * command.price,
        fee: command.fee,
        note: command.note,
        transactionDate: command.transactionDate ?? new Date(),
      }),
    );
  }
}

export interface UpdateTransactionCommand {
  quantity?: number;
  price?: number;
  fee?: number;
  note?: string;
  transactionDate?: Date;
}

/** 종목 · 매수/매도는 바꾸지 않는다 — 지우고 다시 적는다(`SRV-REQ-028` FR-87). 거래일은 바꿀 수 있다 */
export class UpdateTransaction {
  constructor(private readonly deps: LedgerDeps) {}

  async execute(userId: string, transactionId: string, patch: UpdateTransactionCommand) {
    const existing = await this.deps.transactions.findOwned(userId, transactionId);
    if (!existing) throw new TransactionNotFoundError();

    /**
     * `totalAmount` 는 수량·단가에서 파생된다 — 주지 않은 쪽은 기존 값(`applyLedgerChange` 와 같은 정의)
     */
    const quantity = patch.quantity ?? existing.quantity;
    const price = patch.price ?? existing.price;
    const changesAmount = patch.quantity !== undefined || patch.price !== undefined;

    return writeLedger(this.deps, existing, () =>
      this.deps.transactions.update(transactionId, {
        ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
        ...(patch.price !== undefined ? { price: patch.price } : {}),
        ...(changesAmount ? { totalAmount: quantity * price } : {}),
        ...(patch.fee !== undefined ? { fee: patch.fee } : {}),
        ...(patch.note !== undefined ? { note: patch.note } : {}),
        ...(patch.transactionDate ? { transactionDate: patch.transactionDate } : {}),
      }),
    );
  }
}

export class DeleteTransaction {
  constructor(private readonly deps: LedgerDeps) {}

  async execute(userId: string, transactionId: string) {
    const existing = await this.deps.transactions.findOwned(userId, transactionId);
    if (!existing) throw new TransactionNotFoundError();

    // 매수를 지워 뒤의 매도가 가진 것보다 많아지면 거부(롤백)
    await writeLedger(this.deps, existing, () => this.deps.transactions.delete(transactionId));
    return { message: "Transaction deleted successfully" };
  }
}

export type PreviewTransactionCommand =
  | {
      userId: string;
      kind: "create";
      assetType: RecordableAssetType;
      symbol: string;
      transactionType: "buy" | "sell";
      quantity: number;
      price: number;
      fee: number;
      transactionDate: Date;
    }
  | { userId: string; kind: "update"; transactionId: string; patch: Omit<UpdateTransactionCommand, "note"> };

/**
 * 거래 미리보기 — **쓰지 않고** 전후 보유 수량 · 평단 · 총 취득금액(`SRV-REQ-028` FR-85 · `DB-REQ-022` FR-70).
 * 저장과 같은 원장 순서 · 같은 FIFO 재계산 · 같은 과매도 검사(`previewLedgerChange`). 받아들일 수 없으면 저장과 같은 오류
 */
export class PreviewTransaction {
  constructor(private readonly transactions: TransactionRepository) {}

  async execute(command: PreviewTransactionCommand) {
    let target: { symbol: string; assetType: PortfolioAssetType };
    let change: LedgerChange;
    if (command.kind === "create") {
      target = { symbol: command.symbol.toUpperCase(), assetType: command.assetType };
      change = {
        kind: "create",
        entry: {
          transactionType: command.transactionType,
          quantity: command.quantity,
          price: command.price,
          fee: command.fee,
          transactionDate: command.transactionDate,
        },
      };
    } else {
      const existing = await this.transactions.findOwned(command.userId, command.transactionId);
      if (!existing) throw new TransactionNotFoundError();
      target = existing;
      change = { kind: "update", id: existing.id, patch: command.patch };
    }

    const entries: LedgerEntry[] = await this.transactions.findLedger(command.userId, target.symbol, target.assetType);
    const preview = previewLedgerChange(entries, change);
    if (!preview) throw new TransactionNotFoundError();
    return { symbol: target.symbol, assetType: target.assetType, ...preview };
  }
}
