export class UpdateAccountCommand {
  constructor(
    public readonly accountId: string,
    public readonly updateData: Partial<{
      accountName: string;
      accountAlias: string;
      balance: number;
      isActive: boolean;
    }>,
  ) {}
}
