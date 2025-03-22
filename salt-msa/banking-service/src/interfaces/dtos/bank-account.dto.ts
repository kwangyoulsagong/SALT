import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class BankAccountDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  accountNumber: string;

  @ApiProperty()
  accountName: string;

  @ApiProperty()
  bankCode: string;

  @ApiProperty()
  bankName: string;

  @ApiProperty({ required: false })
  accountHolderName?: string;

  @ApiProperty({ required: false })
  fintechUseNum?: string;

  @ApiProperty({ required: false })
  accountAlias?: string;

  @ApiProperty()
  balance: number;

  @ApiProperty({ required: false })
  availableAmount?: number;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ required: false })
  accountType?: string;

  @ApiProperty({ required: false })
  accountState?: string;

  @ApiProperty({ required: false })
  productName?: string;

  @ApiProperty({ required: false })
  lastTransactionDate?: string;

  @ApiProperty()
  createdAt: Date;
}

// 시뮬레이션 계좌 생성을 위한 DTO
export class CreateAccountDto {
  @ApiProperty()
  @IsUUID()
  userId: string;
}
