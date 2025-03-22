import { ApiProperty } from '@nestjs/swagger';
import { BankAccount } from '../../domain/entities/bank-account.entity';

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

  constructor(account?: BankAccount) {
    if (account) {
      this.id = account.id;
      this.accountNumber = account.accountNumber;
      this.accountName = account.accountName;
      this.bankCode = account.bankCode;
      this.bankName = account.bankName;
      this.accountHolderName = account.accountHolderName;
      this.fintechUseNum = account.fintechUseNum;
      this.accountAlias = account.accountAlias;
      this.balance = Number(account.balance);
      this.availableAmount = account.availableAmount
        ? Number(account.availableAmount)
        : undefined;
      this.isActive = account.isActive;
      this.accountType = account.accountType;
      this.accountState = account.accountState;
      this.productName = account.productName;
      this.lastTransactionDate = account.lastTransactionDate;
      this.createdAt = account.createdAt;
    }
  }
}
