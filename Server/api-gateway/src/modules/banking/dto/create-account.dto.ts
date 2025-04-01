import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, Matches } from 'class-validator';

export class CreateAccountDto {
  @ApiProperty({ description: '계좌 소유자 이름', example: '홍길동' })
  @IsString()
  userName: string;

  @ApiProperty({ description: '생년월일 (YYMMDD 형식)', example: '901231' })
  @IsString()
  @Matches(/^\d{6}$/, {
    message: '생년월일은 YYMMDD 형식의 6자리 숫자여야 합니다',
  })
  birthDate: string;

  @ApiProperty({
    description: '계좌 별칭 (선택)',
    required: false,
    example: '급여통장',
  })
  @IsOptional()
  @IsString()
  accountAlias?: string;
}
