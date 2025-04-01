import { IsEmail, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: '로그인 이메일',
    example: 'salt@example.com',
    type: String,
  })
  @IsEmail({}, { message: '올바른 이메일 형식이어야 합니다.' })
  email: string;

  @ApiProperty({
    description: '비밀번호 (최소 6자 이상)',
    example: 'salt123',
    type: String,
  })
  @IsString()
  @MinLength(6, { message: '비밀번호는 최소 6자 이상이어야 합니다.' })
  password: string;
}
