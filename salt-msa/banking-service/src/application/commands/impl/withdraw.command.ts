export class WithdrawCommand {
  constructor(
    public readonly userId: string,
    public readonly accountId: string,
    public readonly amount: number,
    public readonly description?: string,
  ) {}
}
