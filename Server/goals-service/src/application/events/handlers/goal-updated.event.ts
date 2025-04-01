import { Goal } from 'src/domain/entities/goal.entity';

export class GoalUpdatedEvent {
  constructor(public readonly goal: Goal) {}
}
