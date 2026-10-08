import {
  InsufficientQuantityError,
  recalculateHolding,
  revalue,
  shouldKeepHolding,
  TransactionAccessDeniedError,
  TransactionNotFoundError,
  type HoldingRepository,
  type KrStockQuoteSource,
  type PortfolioAssetType,
  type TransactionRepository,
} from "../domain";

/** 거래 입력이 받는 자산군(F011 슬라이스 3b). 주지 않으면 `crypto` — 기존 호출이 그대로 돈다 */
export type RecordableAssetType = Extract<PortfolioAssetType, "crypto" | "kr_stock">;

/**
 * 보유 재계산을 공유하는 부분.
 *
 * 거래를 만들고·고치고·지우는 세 유스케이스가 **끝에 반드시 같은 일**을 한다.
 * 원문은 `private updateHolding()` 으로 묶여 있었고, 유스케이스를 쪼개면서 그 공유가
 * 사라지지 않게 여기 한 함수로 남겼다.
 */
const recalculate = async (
  transactions: TransactionRepository,
  holdings: HoldingRepository,
  krStock: KrStockQuoteSource,
  userId: string,
  symbol: string,
  assetType: PortfolioAssetType
) => {
  const facts = await transactions.findForRecalculation(
    userId,
    symbol,
    assetType
  );
  const snapshot = recalculateHolding(facts);

  if (!shouldKeepHolding(snapshot)) {
    await holdings.remove(userId, symbol, assetType);
    return;
  }
  await holdings.save(userId, symbol, assetType, snapshot);

  /**
   * 국내 주식은 저장된 현재가로 **바로** 평가한다. 코인은 BFF 가 5초 안에 밀어 넣지만 국내 주식 평가는
   * 시세 회차(장중 1분 · 밤엔 없음)를 기다려야 해서, 밤에 기록한 보유가 아침까지 평가액 0 으로 남는다
   */
  if (assetType === "kr_stock") {
    const [price] = await krStock.prices([symbol]);
    const holding = price && (await holdings.findOne(userId, symbol, assetType));
    if (price && holding) await holdings.applyValuation(holding.id, revalue(holding, price.currentPrice));
  }
};

export interface RecordTransactionCommand {
  userId: string;
  /** 국내 주식 소유자 판정(`FORECAST_OWNER_EMAILS`) — 코인은 보지 않는다 */
  email?: string;
  assetType?: RecordableAssetType;
  symbol: string;
  transactionType: "buy" | "sell";
  quantity: number;
  price: number;
  fee: number;
  note?: string;
  transactionDate?: Date;
}

/**
 * 거래 기록.
 *
 * ## 트랜잭션으로 감싸지 않았다 — 원문과 같다
 *
 * 거래 생성과 보유 재계산은 한 덩어리여야 하고, 그러면 `prisma.$transaction` 이 맞다
 * (FR-42 는 트랜잭션을 `application` 에만 두라고 하고 여기가 그 자리다).
 *
 * 그런데 **재계산은 그 사용자·종목의 거래 전체를 다시 읽는다.** 지금 감싸면 거래가
 * 늘수록 트랜잭션이 길어지고, 그 안에서 읽는 행이 계속 늘어난다. 원장이 커지는 것을
 * 전제한 설계(스냅샷 분리 · advisory lock)가 `ledger`(F001)에서 오고, 그때 경계를 정한다.
 *
 * > 지금 위험: 생성 직후 프로세스가 죽으면 보유가 갱신되지 않는다. **다음 거래나
 * > 수정에서 전체 재계산으로 복구된다** — 재계산이 멱등이라 그렇다. 그 성질이
 * > 트랜잭션 없이도 버티는 이유이고, 그래서 원문 구조를 유지했다.
 */
export class RecordTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly holdings: HoldingRepository,
    private readonly krStock: KrStockQuoteSource
  ) {}

  async execute(command: RecordTransactionCommand) {
    const symbol = command.symbol.toUpperCase();
    const assetType = command.assetType ?? "crypto";

    /**
     * 국내 주식은 마스터에 있는 6자리 코드만 — 오타 코드가 보유로 남으면 평가 · 유니버스가 없는 종목을 쫓는다.
     * 단가가 호가 단위 배수가 아니어도 **막지 않는다**(수동 입력 원칙, FR-42 — 안내는 화면 몫)
     */
    if (assetType === "kr_stock") await this.krStock.assertTradable(command.email, symbol);

    if (command.transactionType === "sell") {
      const holding = await this.holdings.findOne(
        command.userId,
        symbol,
        assetType
      );
      if (!holding || holding.totalQuantity < command.quantity) {
        throw new InsufficientQuantityError();
      }
    }

    const transaction = await this.transactions.create({
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
    });

    await recalculate(
      this.transactions,
      this.holdings,
      this.krStock,
      command.userId,
      symbol,
      assetType
    );

    return transaction;
  }
}

export interface UpdateTransactionCommand {
  quantity?: number;
  price?: number;
  fee?: number;
  note?: string;
  transactionDate?: Date;
}

export class UpdateTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly holdings: HoldingRepository,
    private readonly krStock: KrStockQuoteSource
  ) {}

  async execute(
    userId: string,
    transactionId: string,
    patch: UpdateTransactionCommand
  ) {
    const existing = await this.transactions.findById(transactionId);
    if (!existing) throw new TransactionNotFoundError();
    if (existing.userId !== userId) throw new TransactionAccessDeniedError();

    /**
     * `totalAmount` 는 수량·단가에서 파생된다. 원문은 두 `if` 에서 각자 계산해
     * **둘 다 주면 뒤의 것이 이긴다** — 결과는 같지만 정의가 두 번 쓰여 있었다.
     * 하나로 합친다: 주지 않은 쪽은 기존 값을 쓴다.
     */
    const quantity = patch.quantity ?? existing.quantity;
    const price = patch.price ?? existing.price;
    const changesAmount =
      patch.quantity !== undefined || patch.price !== undefined;

    const updated = await this.transactions.update(transactionId, {
      ...(patch.quantity !== undefined ? { quantity: patch.quantity } : {}),
      ...(patch.price !== undefined ? { price: patch.price } : {}),
      ...(changesAmount ? { totalAmount: quantity * price } : {}),
      ...(patch.fee !== undefined ? { fee: patch.fee } : {}),
      ...(patch.note !== undefined ? { note: patch.note } : {}),
      ...(patch.transactionDate ? { transactionDate: patch.transactionDate } : {}),
    });

    await recalculate(
      this.transactions,
      this.holdings,
      this.krStock,
      userId,
      existing.symbol,
      existing.assetType
    );

    return updated;
  }
}

export class DeleteTransaction {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly holdings: HoldingRepository,
    private readonly krStock: KrStockQuoteSource
  ) {}

  async execute(userId: string, transactionId: string) {
    const existing = await this.transactions.findById(transactionId);
    if (!existing) throw new TransactionNotFoundError();
    if (existing.userId !== userId) throw new TransactionAccessDeniedError();

    await this.transactions.delete(transactionId);

    await recalculate(
      this.transactions,
      this.holdings,
      this.krStock,
      userId,
      existing.symbol,
      existing.assetType
    );

    return { message: "Transaction deleted successfully" };
  }
}
