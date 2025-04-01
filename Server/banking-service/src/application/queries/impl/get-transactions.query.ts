export class GetTransactionsQuery {
  constructor(
    public readonly userId: string,
    public readonly accountId: string,
    public readonly page: number = 1,
    public readonly limit: number = 10,
    public readonly startDate?: Date,
    public readonly endDate?: Date,
  ) {}
}
