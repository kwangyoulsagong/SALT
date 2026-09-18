import {
  AccountNotFoundError,
  type AccountStore,
  type AccountView,
} from "../domain";

/** 현재 사용자 (`GET /api/auth/me`). 응답 모양은 이관 전과 같다. */
export class GetAccount {
  constructor(private readonly accounts: AccountStore) {}

  async execute(userId: string): Promise<AccountView> {
    const account = await this.accounts.findById(userId);
    if (!account) throw new AccountNotFoundError();
    return account;
  }
}
