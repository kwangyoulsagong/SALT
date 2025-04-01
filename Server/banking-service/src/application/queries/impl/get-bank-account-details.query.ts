export class GetBankAccountDetailsQuery {
  constructor(
    public readonly userId: string,
    public readonly accountId: string,
  ) {}
}
