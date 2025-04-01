export class UpdateGoalCommand {
  constructor(
    public readonly goalId: string,
    public readonly updateData: {
      title?: string;
      targetAmount?: number;
      currentAmount?: number;
      deadline?: Date;
    },
  ) {}
}
