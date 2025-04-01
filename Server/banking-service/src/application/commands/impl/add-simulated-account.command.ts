export class AddSimulatedAccountCommand {
  constructor(
    public readonly userId: string,
    public readonly userName: string,
    public readonly birthDate: string,
    public readonly accountAlias?: string,
  ) {}
}
