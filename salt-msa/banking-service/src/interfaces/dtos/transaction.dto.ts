import { ApiProperty } from '@nestjs/swagger';
import {
  TransactionType,
  InOutType,
} from '../../domain/entities/transaction.entity';

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
}
