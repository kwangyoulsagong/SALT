import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { InternalServerErrorException, Logger } from '@nestjs/common';
import { AddSimulatedAccountCommand } from '../impl/add-simulated-account.command';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';
import { BankAccount } from '../../../domain/entities/bank-account.entity';
import { AccountCreatedEvent } from '../../events/handlers/account-created.event';
import { SimulationUtil } from '../../../infrastructure/utils/simulation.util';

@CommandHandler(AddSimulatedAccountCommand)
export class AddSimulatedAccountHandler
  implements ICommandHandler<AddSimulatedAccountCommand>
{
  private readonly logger = new Logger(AddSimulatedAccountHandler.name);

  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: AddSimulatedAccountCommand): Promise<BankAccount> {
    try {
      this.logger.log(
        `Creating simulated account for user: ${command.userId}, name: ${command.userName}`,
      );

      // 사용자 정보로 시뮬레이션 계좌 데이터 생성 (0원 잔액으로 시작)
      const simulatedAccounts = SimulationUtil.generateSimulatedAccounts(
        command.userId,
        command.userName,
        command.birthDate,
        1,
      );

      const accountData = simulatedAccounts[0];

      // 계좌 별칭 설정 (지정된 경우)
      if (command.accountAlias) {
        accountData.accountAlias = command.accountAlias;
      }

      const account = this.bankAccountRepository.create(accountData);

      // 계좌 저장
      const newAccount = await this.bankAccountRepository.save(account);

      // 이벤트 직접 발행
      this.eventBus.publish(new AccountCreatedEvent(newAccount));

      this.logger.log(`Simulated account created: ${newAccount.id}`);
      return newAccount;
    } catch (error: unknown) {
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
