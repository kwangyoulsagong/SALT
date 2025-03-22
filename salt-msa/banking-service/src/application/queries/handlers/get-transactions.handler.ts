import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Logger } from '@nestjs/common';
import { GetTransactionsQuery } from '../impl/get-transactions.query';
import { TransactionRepository } from '../../../domain/repositories/transaction.repository';
import { TransactionDto } from '../../../interfaces/dtos/transaction.dto';
import { PaginationDto } from '../../../interfaces/dtos/pagination.dto';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';

@QueryHandler(GetTransactionsQuery)
export class GetTransactionsHandler
  implements IQueryHandler<GetTransactionsQuery>
{
  private readonly logger = new Logger(GetTransactionsHandler.name);

  constructor(
    private readonly transactionRepository: TransactionRepository,
    private readonly bankAccountRepository: BankAccountRepository,
  ) {}

  async execute(
    query: GetTransactionsQuery,
  ): Promise<PaginationDto<TransactionDto>> {
    this.logger.log(
      `Fetching transactions for account ${query.accountId}, user ${query.userId}`,
    );

    const { userId, accountId, page, limit, startDate, endDate } = query;

    // 계좌 소유자 확인
    const account = await this.bankAccountRepository.findByIdAndUserId(
      accountId,
      userId,
    );
    if (!account) {
      this.logger.warn(`Account not found: ${accountId} for user ${userId}`);
      throw new NotFoundException('Bank account not found');
    }

    const [transactions, total] =
      await this.transactionRepository.findByAccountId(
        accountId,
        page,
        limit,
        startDate,
        endDate,
      );

    const items = transactions.map((transaction) => {
      const dto = new TransactionDto();
      dto.id = transaction.id;
      dto.tranType = transaction.tranType;
      dto.inoutType = transaction.inoutType;
      dto.tranAmount = transaction.tranAmount;
      dto.afterBalanceAmount = transaction.afterBalanceAmount;
      dto.printContent = transaction.printContent;
      dto.branchName = transaction.branchName;
      dto.tranDate = transaction.tranDate;
      dto.tranTime = transaction.tranTime;
      dto.bankAccountId = transaction.bankAccountId;
      dto.createdAt = transaction.createdAt;
      return dto;
    });

    const totalPages = Math.ceil(total / limit);

    return {
      items,
      total,
      page,
      limit,
      totalPages,
    };
  }
}
