import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { NotFoundException, Logger } from '@nestjs/common';
import { UpdateAccountCommand } from '../impl/update-account.command';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';
import { BankAccount } from '../../../domain/entities/bank-account.entity';
import { AccountUpdatedEvent } from '../../events/handlers/account-updated.event';

@CommandHandler(UpdateAccountCommand)
export class UpdateAccountHandler
  implements ICommandHandler<UpdateAccountCommand>
{
  private readonly logger = new Logger(UpdateAccountHandler.name);

  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: UpdateAccountCommand): Promise<BankAccount> {
    const { accountId, updateData } = command;

    this.logger.log(
      `Updating account ${accountId} with data: ${JSON.stringify(updateData)}`,
    );

    // 계좌 조회
    const account = await this.bankAccountRepository.findById(accountId);

    if (!account) {
      this.logger.warn(`Account not found: ${accountId}`);
      throw new NotFoundException('계좌를 찾을 수 없습니다.');
    }

    // 계좌 데이터 업데이트
    Object.assign(account, updateData);

    // 가용 금액 업데이트 (잔액이 수정된 경우)
    if (updateData.balance !== undefined) {
      const newBalance =
        typeof updateData.balance === 'string'
          ? parseFloat(updateData.balance)
          : updateData.balance;

      account.availableAmount = newBalance * 0.95;
    }

    // 수정된 계좌 저장
    const updatedAccount = await this.bankAccountRepository.save(account);

    // 이벤트 직접 발행
    this.eventBus.publish(new AccountUpdatedEvent(updatedAccount));

    this.logger.log(`Account updated successfully: ${accountId}`);
    return updatedAccount;
  }
}
