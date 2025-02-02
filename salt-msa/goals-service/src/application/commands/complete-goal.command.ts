export class CompleteGoalCommand {
  constructor(
    public readonly goalId: string,
    public readonly userId: string,
  ) {}
}
