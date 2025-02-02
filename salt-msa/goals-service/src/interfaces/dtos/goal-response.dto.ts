import { ApiProperty } from '@nestjs/swagger';
import type { Goal } from '../types/goal.interface';
export class GoalResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  userId: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  targetAmount: number;

  @ApiProperty()
  currentAmount: number;

  @ApiProperty()
  deadline: Date;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  progress: number;

  constructor(goal: Goal) {
    this.id = goal.id;
    this.userId = goal.userId;
    this.title = goal.title;
    this.targetAmount = goal.targetAmount;
    this.currentAmount = goal.currentAmount;
    this.deadline = goal.deadline;
    this.status = goal.status;
    this.createdAt = goal.createdAt;
    this.updatedAt = goal.updatedAt;
    this.progress = (this.currentAmount / this.targetAmount) * 100;
  }
}
