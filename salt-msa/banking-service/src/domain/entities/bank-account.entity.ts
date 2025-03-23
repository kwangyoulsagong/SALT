import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Transaction } from './transaction.entity';

@Entity('bank_accounts')
export class BankAccount {
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
  birthDate: string; // 생년월일 (YYMMDD 형식)

  @Column({ nullable: true })
  fintechUseNum: string;

  @Column({ nullable: true })
  accountAlias: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  balance: number | string;

  @Column({ type: 'decimal', precision: 15, scale: 2, nullable: true })
  availableAmount: number | string;

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
}
