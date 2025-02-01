export class GoalResponseDto {
  id: string;
  userId: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  deadline: Date;
  status: string;
  progress: number;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<GoalResponseDto>) {
    Object.assign(this, partial);
    this.progress = (this.currentAmount / this.targetAmount) * 100;
  }
}
