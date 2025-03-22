import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ description: '계좌 별칭 (선택)' })
  @IsOptional()
  @IsString()
  accountAlias?: string;
}
