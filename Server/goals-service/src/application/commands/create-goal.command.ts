export class CreateGoalCommand {
  constructor(
    public readonly userId: string,
    public readonly title: string,
    public readonly targetAmount: number,
    public readonly deadline: Date,
  ) {}
}
