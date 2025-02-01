import { PartialType } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { CreateGoalDto } from './create-goal.dto';

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsNumber()
  @Min(0)
  currentAmount?: number;
}
