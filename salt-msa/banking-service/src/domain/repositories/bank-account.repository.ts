import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { SimulationUtil } from '../../infrastructure/utils/simulation.util';

@Injectable()
export class BankAccountRepository {
  private readonly logger = new Logger(BankAccountRepository.name);

  constructor(
    @InjectRepository(BankAccount)
    private readonly repository: Repository<BankAccount>,
  ) {}

  async findByUserId(userId: string): Promise<BankAccount[]> {
    return this.repository.find({
      where: { userId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findByIdAndUserId(
    id: string,
    userId: string,
  ): Promise<BankAccount | null> {
    return this.repository.findOne({
      where: { id, userId, isActive: true },
    });
  }

  async findById(id: string): Promise<BankAccount | null> {
    return this.repository.findOne({
      where: { id, isActive: true },
    });
  }

  async findByFintechUseNum(
    fintechUseNum: string,
  ): Promise<BankAccount | null> {
    return this.repository.findOne({
      where: { fintechUseNum, isActive: true },
    });
  }

  create(data: Partial<BankAccount>): BankAccount {
    return this.repository.create(data);
  }

  async save(account: BankAccount): Promise<BankAccount> {
    return this.repository.save(account);
  }

  // 시뮬레이션 계좌 데이터 생성
  generateSimulatedAccountData(
    userId: string,
    userName: string,
    birthDate: string,
  ): Partial<BankAccount> {
    const simulatedAccounts = SimulationUtil.generateSimulatedAccounts(
      userId,
      userName,
      birthDate,
      1,
    );

    const accountData = simulatedAccounts[0];

    return accountData;
  }
}
