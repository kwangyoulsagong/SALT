import { AggregateRoot } from '@nestjs/cqrs';
import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

import { Transaction } from './transaction.entity';
import { AccountCreatedEvent } from '../events/account-created.event';

@Entity('bank_accounts')
export class BankAccount extends AggregateRoot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  accountNumber: string;

  @Column()
  accountName: string;

  @Column()
  bankCode: string;

  @Column()
  bankName: string;

  @Column({ nullable: true })
  accountHolderName: string;

  @Column({ nullable: true })
  fintechUseNum: string;

  @Column({ nullable: true })
  accountAlias: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  availableAmount: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  accountType: string;

  @Column({ nullable: true })
  accountState: string;

  @Column({ nullable: true })
  productName: string;

  @Column({ nullable: true })
  lastTransactionDate: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Transaction, (transaction) => transaction.bankAccount)
  transactions: Transaction[];

  createAccount() {
    this.apply(new AccountCreatedEvent(this));
  }

  updateBalance(amount: number) {
    this.balance += amount;
    this.availableAmount = this.balance * 0.95;
  }
}
