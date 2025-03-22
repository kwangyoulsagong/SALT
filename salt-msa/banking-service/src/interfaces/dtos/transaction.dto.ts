import { ApiProperty } from '@nestjs/swagger';
import {
  TransactionType,
  InOutType,
} from '../../domain/entities/transaction.entity';
import { Transaction } from '../../domain/entities/transaction.entity';

export class TransactionDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: TransactionType })
  tranType: TransactionType;

  @ApiProperty({ enum: InOutType })
  inoutType: InOutType;

  @ApiProperty()
  tranAmount: number;

  @ApiProperty()
  afterBalanceAmount: number;

  @ApiProperty()
  printContent: string;

  @ApiProperty({ required: false })
  branchName?: string;

  @ApiProperty()
  tranDate: string;

  @ApiProperty()
  tranTime: string;

  @ApiProperty()
  bankAccountId: string;

  @ApiProperty()
  createdAt: Date;

  constructor(transaction?: Transaction) {
    if (transaction) {
      this.id = transaction.id;
      this.tranType = transaction.tranType;
      this.inoutType = transaction.inoutType;
      this.tranAmount = Number(transaction.tranAmount);
      this.afterBalanceAmount = Number(transaction.afterBalanceAmount);
      this.printContent = transaction.printContent;
      this.branchName = transaction.branchName;
      this.tranDate = transaction.tranDate;
      this.tranTime = transaction.tranTime;
      this.bankAccountId = transaction.bankAccountId;
      this.createdAt = transaction.createdAt;
    }
  }
}
