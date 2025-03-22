import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual } from 'typeorm';
import { Transaction } from '../entities/transaction.entity';
import { SimulationUtil } from '../../infrastructure/utils/simulation.util';
import { BankAccount } from '../entities/bank-account.entity';

@Injectable()
export class TransactionRepository {
  private readonly logger = new Logger(TransactionRepository.name);

  constructor(
    @InjectRepository(Transaction)
    private readonly repository: Repository<Transaction>,
  ) {}

  async findByAccountId(
    bankAccountId: string,
    page: number = 1,
    limit: number = 10,
    startDate?: Date,
    endDate?: Date,
  ): Promise<[Transaction[], number]> {
    const skip = (page - 1) * limit;

    const whereCondition: any = { bankAccountId };

    if (startDate && endDate) {
      whereCondition.tranDate = Between(
        startDate.toISOString().slice(0, 10).replace(/-/g, ''),
        endDate.toISOString().slice(0, 10).replace(/-/g, ''),
      );
    } else if (startDate) {
      const startDateStr = startDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      whereCondition.tranDate = MoreThanOrEqual(startDateStr);
    }

    return this.repository.findAndCount({
      where: whereCondition,
      order: { tranDate: 'DESC', tranTime: 'DESC' },
      skip,
      take: limit,
    });
  }

  create(data: Partial<Transaction>): Transaction {
    return this.repository.create(data);
  }

  async save(transaction: Transaction): Promise<Transaction> {
    return this.repository.save(transaction);
  }

  async createSimulatedTransactions(
    bankAccountId: string,
    account?: BankAccount,
  ): Promise<Transaction[]> {
    let accountBalance = 0;

    if (account) {
      accountBalance = Number(account.balance);
    } else {
      accountBalance = Math.floor(1000000 + Math.random() * 9000000);
    }

    const simulatedTransactions = SimulationUtil.generateSimulatedTransactions(
      bankAccountId,
      accountBalance,
    );

    const createdTransactions: Transaction[] = [];

    for (const transactionData of simulatedTransactions) {
      const transaction = this.create(transactionData);
      const savedTransaction = await this.save(transaction);
      createdTransactions.push(savedTransaction);
    }

    this.logger.log(
      `계좌 ${bankAccountId}를 위해 ${createdTransactions.length}개의 시뮬레이션 거래내역이 생성되었습니다.`,
    );
    return createdTransactions;
  }
}
