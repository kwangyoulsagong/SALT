import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TransactionQueryDto {
  @ApiProperty({ description: '페이지 번호', default: 1, required: false })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiProperty({
    description: '페이지당 항목 수',
    default: 10,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number = 10;

  @ApiProperty({ description: '조회 시작일(YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiProperty({ description: '조회 종료일(YYYY-MM-DD)', required: false })
  @IsOptional()
  @IsString()
  endDate?: string;
}
