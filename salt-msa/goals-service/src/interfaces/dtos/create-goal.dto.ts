import { IsString, IsUUID, IsNumber, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateGoalDto {
  @IsUUID()
  userId: string;

  @IsString()
  title: string;

  @IsNumber()
  @Min(0)
  targetAmount: number;

  @Type(() => Date)
  @IsDate()
  deadline: Date;

  @IsString({ each: true })
  categories?: string[];
}
