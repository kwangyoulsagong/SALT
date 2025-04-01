import { BankAccount } from '../../../domain/entities/bank-account.entity';

export class AccountUpdatedEvent {
  constructor(public readonly account: BankAccount) {}
}
