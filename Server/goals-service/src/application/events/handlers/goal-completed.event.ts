import { Goal } from '../../../domain/entities/goal.entity';

export class GoalCompletedEvent {
  constructor(public readonly goal: Goal) {}
}
