import {
  Column,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { BankAccount } from './bank-account.entity';

export enum TransactionType {
  ACCOUNT_TRANSFER = '계좌이체',
  ATM_WITHDRAWAL = 'ATM출금',
  ATM_DEPOSIT = 'ATM입금',
  CARD_PAYMENT = '카드결제',
  SALARY = '급여',
  UTILITIES = '공과금',
  AUTO_PAYMENT = '자동이체',
}

export enum InOutType {
  IN = '입금',
  OUT = '출금',
}

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  bankAccountId: string;

  @Column({ type: 'enum', enum: TransactionType })
  tranType: TransactionType;

  @Column({ type: 'enum', enum: InOutType })
  inoutType: InOutType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  tranAmount: number;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  afterBalanceAmount: number;

  @Column()
  printContent: string;

  @Column({ nullable: true })
  branchName: string;

  @Column()
  tranDate: string;

  @Column()
  tranTime: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @ManyToOne(() => BankAccount, (bankAccount) => bankAccount.transactions)
  @JoinColumn({ name: 'bankAccountId' })
  bankAccount: BankAccount;
}
