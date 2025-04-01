import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsUUID, IsDate } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CreateGoalDto {
  @ApiProperty()
  @IsUUID()
  userId: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  targetAmount: number;

  @ApiProperty()
  @Transform(({ value }) => new Date(value)) // 문자열을 Date 객체로 변환
  @Type(() => Date)
  @IsDate()
  deadline: Date;
}
