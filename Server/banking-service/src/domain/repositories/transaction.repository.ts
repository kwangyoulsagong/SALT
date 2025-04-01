import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Repository,
  Between,
  MoreThanOrEqual,
  FindOptionsWhere,
} from 'typeorm';
import { Transaction } from '../entities/transaction.entity';

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

    // 명시적 타입 지정으로 any 타입 제거
    const whereCondition: FindOptionsWhere<Transaction> = { bankAccountId };

    if (startDate && endDate) {
      const startDateStr = startDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      const endDateStr = endDate.toISOString().slice(0, 10).replace(/-/g, '');
      whereCondition.tranDate = Between(startDateStr, endDateStr);
    } else if (startDate) {
      const startDateStr = startDate
        .toISOString()
        .slice(0, 10)
        .replace(/-/g, '');
      whereCondition.tranDate = MoreThanOrEqual(startDateStr);
    }

    return this.repository.findAndCount({
      where: whereCondition,
      order: {
        tranDate: 'DESC',
        tranTime: 'DESC',
      },
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
}
