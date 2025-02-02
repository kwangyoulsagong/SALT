import { Goal } from '../entities/goal.entity';

export class GoalCreatedEvent {
  public readonly goalId: string;
  public readonly userId: string;
  public readonly targetAmount: number;
  public readonly title: string;

  constructor(goal: Goal) {
    this.goalId = goal.id;
    this.userId = goal.userId;
    this.targetAmount = goal.targetAmount;
    this.title = goal.title;
  }
}
