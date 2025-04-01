import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsNumber()
  targetAmount: number;

  @ApiProperty()
  @Type(() => Date)
  @IsDate()
  deadline: Date;
}
