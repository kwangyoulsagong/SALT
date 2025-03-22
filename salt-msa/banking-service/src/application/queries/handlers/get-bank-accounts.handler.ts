import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { GetBankAccountsQuery } from '../impl/get-bank-accounts.query';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';
import { BankAccountDto } from '../../../interfaces/dtos/bank-account.dto';

@QueryHandler(GetBankAccountsQuery)
export class GetBankAccountsHandler
  implements IQueryHandler<GetBankAccountsQuery>
{
  private readonly logger = new Logger(GetBankAccountsHandler.name);

  constructor(private readonly bankAccountRepository: BankAccountRepository) {}

  async execute(query: GetBankAccountsQuery): Promise<BankAccountDto[]> {
    this.logger.log(`Fetching accounts for user ${query.userId}`);

    const { userId } = query;
    const accounts = await this.bankAccountRepository.findByUserId(userId);

    return accounts.map((account) => {
      const dto = new BankAccountDto();
      dto.id = account.id;
      dto.accountNumber = account.accountNumber;
      dto.accountName = account.accountName;
      dto.bankCode = account.bankCode;
      dto.bankName = account.bankName;
      dto.accountHolderName = account.accountHolderName;
      dto.fintechUseNum = account.fintechUseNum;
      dto.accountAlias = account.accountAlias;
      dto.balance = account.balance;
      dto.availableAmount = account.availableAmount;
      dto.isActive = account.isActive;
      dto.accountType = account.accountType;
      dto.accountState = account.accountState;
      dto.productName = account.productName;
      dto.lastTransactionDate = account.lastTransactionDate;
      dto.createdAt = account.createdAt;
      return dto;
    });
  }
}
