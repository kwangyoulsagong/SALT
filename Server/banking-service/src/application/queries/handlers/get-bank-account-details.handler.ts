import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { NotFoundException, Logger } from '@nestjs/common';
import { GetBankAccountDetailsQuery } from '../impl/get-bank-account-details.query';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';
import { BankAccountDto } from '../../../interfaces/dtos/bank-account.dto';

@QueryHandler(GetBankAccountDetailsQuery)
export class GetBankAccountDetailsHandler
  implements IQueryHandler<GetBankAccountDetailsQuery>
{
  private readonly logger = new Logger(GetBankAccountDetailsHandler.name);

  constructor(private readonly bankAccountRepository: BankAccountRepository) {}

  async execute(query: GetBankAccountDetailsQuery): Promise<BankAccountDto> {
    this.logger.log(
      `Fetching account details for user ${query.userId}, account ${query.accountId}`,
    );

    const { userId, accountId } = query;
    const account = await this.bankAccountRepository.findByIdAndUserId(
      accountId,
      userId,
    );

    if (!account) {
      this.logger.warn(`Account not found: ${accountId} for user ${userId}`);
      throw new NotFoundException('Bank account not found');
    }

    return new BankAccountDto(account);
  }
}
