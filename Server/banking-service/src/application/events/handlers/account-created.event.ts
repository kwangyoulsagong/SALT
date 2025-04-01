import { BankAccount } from '../../../domain/entities/bank-account.entity';

export class AccountCreatedEvent {
  constructor(public readonly account: BankAccount) {}
}
