import {
  InsufficientQuantityError,
  recalculateHolding,
  shouldKeepHolding,
  TransactionAccessDeniedError,
  TransactionNotFoundError,
  type HoldingRepository,
  type PortfolioAssetType,
  type TransactionRepository,
} from "../domain";

/**
 * 자산군 기본값.
 *
 * `PortfolioTransaction`·`PortfolioHolding` 의 유니크 키는 `(userId, symbol, assetType)`
 * 이고 `assetType` 은 필수인데 **DTO 가 그것을 받지 않는다** — 컬럼이 나중에 추가되면서
 * 코드가 따라오지 않았고, 그 때문에 이 서비스는 컴파일되지 않고 있었다
 * (`SRV-REQ-006` 체크리스트 §6).
 *
 * API 계약을 바꾸지 않기 위해 기본값을 유지한다. **주식이 들어오면(F000·F001) DTO 에
 * `assetType` 을 추가하고 이 상수를 지운다.** 그때 프론트·BFF 계약도 함께 바뀐다.
 */
const DEFAULT_ASSET_TYPE: PortfolioAssetType = "crypto";

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

  if (shouldKeepHolding(snapshot)) {
    await holdings.save(userId, symbol, assetType, snapshot);
  } else {
    await holdings.remove(userId, symbol, assetType);
  }
};

export interface RecordTransactionCommand {
  userId: string;
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
    private readonly holdings: HoldingRepository
  ) {}

  async execute(command: RecordTransactionCommand) {
    const symbol = command.symbol.toUpperCase();

    if (command.transactionType === "sell") {
      const holding = await this.holdings.findOne(
        command.userId,
        symbol,
        DEFAULT_ASSET_TYPE
      );
      if (!holding || holding.totalQuantity < command.quantity) {
        throw new InsufficientQuantityError();
      }
    }

    const transaction = await this.transactions.create({
      userId: command.userId,
      symbol,
      assetType: DEFAULT_ASSET_TYPE,
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
      command.userId,
      symbol,
      DEFAULT_ASSET_TYPE
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
    private readonly holdings: HoldingRepository
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
    private readonly holdings: HoldingRepository
  ) {}

  async execute(userId: string, transactionId: string) {
    const existing = await this.transactions.findById(transactionId);
    if (!existing) throw new TransactionNotFoundError();
    if (existing.userId !== userId) throw new TransactionAccessDeniedError();

    await this.transactions.delete(transactionId);

    await recalculate(
      this.transactions,
      this.holdings,
      userId,
      existing.symbol,
      existing.assetType
    );

    return { message: "Transaction deleted successfully" };
  }
}
