import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { WithdrawCommand } from '../impl/withdraw.command';
import { BankAccountRepository } from '../../../domain/repositories/bank-account.repository';
import { TransactionRepository } from '../../../domain/repositories/transaction.repository';
import { BankAccount } from '../../../domain/entities/bank-account.entity';
import {
  TransactionType,
  InOutType,
} from '../../../domain/entities/transaction.entity';
import { AccountUpdatedEvent } from '../../events/handlers/account-updated.event';

@CommandHandler(WithdrawCommand)
export class WithdrawHandler implements ICommandHandler<WithdrawCommand> {
  private readonly logger = new Logger(WithdrawHandler.name);

  constructor(
    private readonly bankAccountRepository: BankAccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly eventBus: EventBus,
  ) {}

  async execute(command: WithdrawCommand): Promise<BankAccount> {
    const { userId, accountId, amount, description } = command;

    this.logger.log(
      `Processing withdrawal of ${amount} from account ${accountId}`,
    );

    // 계좌 조회
    const account = await this.bankAccountRepository.findByIdAndUserId(
      accountId,
      userId,
    );

    if (!account) {
      throw new NotFoundException('계좌를 찾을 수 없습니다.');
    }

    if (!account.isActive) {
      throw new BadRequestException('비활성화된 계좌입니다.');
    }

    // 계좌 잔액 확인
    const currentBalance =
      typeof account.balance === 'string'
        ? parseFloat(account.balance)
        : account.balance;

    if (currentBalance < amount) {
      throw new BadRequestException('잔액이 부족합니다.');
    }

    if (amount <= 0) {
      throw new BadRequestException('출금 금액은 0보다 커야 합니다.');
    }

    // 계좌 잔액 업데이트
    account.balance = currentBalance - amount;
    account.availableAmount = Number(account.balance) * 0.95; // 가용 금액 업데이트
    account.lastTransactionDate = new Date()
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '');

    // 계좌 저장
    const updatedAccount = await this.bankAccountRepository.save(account);

    // 거래 내역 생성
    const transaction = this.transactionRepository.create({
      bankAccountId: accountId,
      tranType: TransactionType.ATM_WITHDRAWAL,
      inoutType: InOutType.OUT,
      tranAmount: amount,
      afterBalanceAmount: Number(updatedAccount.balance),
      printContent: description || '출금',
      branchName: '인터넷뱅킹',
      tranDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      tranTime: new Date().toTimeString().slice(0, 8).replace(/:/g, ''),
    });

    await this.transactionRepository.save(transaction);

    // 이벤트 발행
    this.eventBus.publish(new AccountUpdatedEvent(updatedAccount));

    this.logger.log(
      `Withdrawal processed successfully. New balance: ${updatedAccount.balance}`,
    );

    return updatedAccount;
  }
}
