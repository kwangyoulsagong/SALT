import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class WithdrawDto {
  @ApiProperty({ description: '출금 금액', example: 5000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '출금 내용', example: '식비', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
