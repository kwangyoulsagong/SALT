import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AddSimulatedAccountCommand } from '../impl/add-simulated-account.command';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';
import { TransactionRepository } from '../../../domain/repositories/transaction.repository';
import { BankAccount } from '../../../domain/entities/bank-account.entity';
import { AccountCreatedEvent } from '../../events/handlers/account-created.event';

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

      // 시뮬레이션 계좌 데이터 생성
      const accountData =
        this.bankAccountRepository.generateSimulatedAccountData(command.userId);
      const account = this.bankAccountRepository.create(accountData);

      // 계좌 저장
      const newAccount = await this.bankAccountRepository.save(account);

      // 이벤트 직접 발행
      this.eventBus.publish(new AccountCreatedEvent(newAccount));

      // 계좌에 대한 거래 내역 생성
      await this.transactionRepository.createSimulatedTransactions(
        newAccount.id,
        newAccount,
      );

      this.logger.log(`Simulated account created: ${newAccount.id}`);
      return newAccount;
    } catch (error: unknown) {
      // 에러에 타입 지정
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      const errorStack = error instanceof Error ? error.stack : undefined;

      this.logger.error(
        `Failed to create simulated account: ${errorMessage}`,
        errorStack,
      );
      throw new InternalServerErrorException('계좌 생성에 실패했습니다.');
    }
  }
}
