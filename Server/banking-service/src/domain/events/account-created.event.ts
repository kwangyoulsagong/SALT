import { BankAccount } from '../entities/bank-account.entity';

export class AccountCreatedEvent {
  constructor(public readonly account: BankAccount) {}

  get accountId(): string {
    return this.account.id;
  }

  get userId(): string {
    return this.account.userId;
  }

  get bankName(): string {
    return this.account.bankName;
  }

  get accountNumber(): string {
    return this.account.accountNumber;
  }

  get balance(): number {
    return Number(this.account.balance);
  }
}
