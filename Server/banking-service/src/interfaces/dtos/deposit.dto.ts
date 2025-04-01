import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class DepositDto {
  @ApiProperty({ description: '입금 금액', example: 10000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ description: '입금 내용', example: '월급', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}
