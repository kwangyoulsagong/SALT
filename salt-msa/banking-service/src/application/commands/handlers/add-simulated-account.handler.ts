import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AddSimulatedAccountCommand } from '../impl/add-simulated-account.command';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';
import { TransactionRepository } from '../../../domain/repositories/transaction.repository';
import { BankAccount } from '../../../domain/entities/bank-account.entity';

@CommandHandler(AddSimulatedAccountCommand)
export class AddSimulatedAccountHandler
  implements ICommandHandler<AddSimulatedAccountCommand>
{
  private readonly logger = new Logger(AddSimulatedAccountHandler.name);

  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: AddSimulatedAccountCommand): Promise<BankAccount> {
    try {
      this.logger.log(`Creating simulated account for user: ${command.userId}`);

      // 시뮬레이션된 계좌 생성
      const newAccount =
        await this.bankAccountRepository.createSimulatedAccount(command.userId);

      // AggregateRoot에서 적용된 이벤트를 commit해서 발행
      newAccount.commit();

      // 계좌에 대한 거래 내역 생성
      await this.transactionRepository.createSimulatedTransactions(
        newAccount.id,
        newAccount,
      );

      this.logger.log(`Simulated account created: ${newAccount.id}`);
      return newAccount;
    } catch (error) {
      this.logger.error(
        `Failed to create simulated account: ${error.message}`,
        error.stack,
      );
      throw new InternalServerErrorException('계좌 생성에 실패했습니다.');
    }
  }
}
