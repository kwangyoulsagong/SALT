import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BankAccount } from '../entities/bank-account.entity';
import { SimulationUtil } from 'src/infrastructure/utils/simulation.util';

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

  async findByIdAndUserId(id: string, userId: string): Promise<BankAccount> {
    return this.repository.findOne({
      where: { id, userId, isActive: true },
    });
  }

  async findById(id: string): Promise<BankAccount> {
    return this.repository.findOne({
      where: { id, isActive: true },
    });
  }

  async findByFintechUseNum(fintechUseNum: string): Promise<BankAccount> {
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

  async createSimulatedAccount(userId: string): Promise<BankAccount> {
    const simulatedAccounts = SimulationUtil.generateSimulatedAccounts(
      userId,
      1,
    );
    const accountData = simulatedAccounts[0];

    const account = this.create(accountData);
    account.availableAmount = account.balance * 0.95;

    const savedAccount = await this.save(account);

    // DDD 이벤트 적용
    savedAccount.createAccount();

    this.logger.log(
      `사용자 ${userId}를 위한 시뮬레이션 계좌가 생성되었습니다. ID: ${savedAccount.id}`,
    );

    return savedAccount;
  }
}
