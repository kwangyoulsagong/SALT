export class GoalCreatedEvent {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
  ) {}
}
