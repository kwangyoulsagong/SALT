import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateAccountDto {
  @ApiProperty({ description: '계좌 별칭', required: false })
  @IsOptional()
  @IsString()
  accountAlias?: string;

  @ApiProperty({ description: '계좌 활성화 여부', required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
