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

    return accounts.map((account) => new BankAccountDto(account));
  }
}
