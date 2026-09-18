import type {
  AccountStore,
  InviteAttemptLog,
  InviteCodeStore,
  PasswordHasher,
  TokenIssuer,
  UserCountProbe,
} from "../../domain";
import { AcceptInviteCode } from "../AcceptInviteCode";
import { CheckInviteCode } from "../CheckInviteCode";
import { GetAccount } from "../GetAccount";
import { Login } from "../Login";
import { RefreshSession } from "../RefreshSession";

/**
 * `auth` 의 조립 지점.
 *
 * ## 공개 API 가 비어 있다
 *
 * 다른 컨텍스트가 `auth` 에게 물을 것이 지금은 없다. 토큰 검증은 `shared/presentation` 의
 * 미들웨어가 하고(전송 계층이라 거기 있다), 온보딩의 `invite` 스텝은 **인증된 요청이
 * 이미 초대를 통과했다는 사실** 자체라 조회가 필요 없다.
 *
 * 쓰지 않는 `AuthApi` 를 미리 두지 않는다 — 소비처가 없는 계약은 검증되지 않는다는 것이
 * 이 레포가 관심 목록에서 배운 것이다(`F000-watchlist-tab-slice.md`). 필요해지는 순간
 * 그 소비처와 함께 연다.
 */
export interface AuthDependencies {
  invites: InviteCodeStore;
  accounts: AccountStore;
  userCount: UserCountProbe;
  hasher: PasswordHasher;
  tokens: TokenIssuer;
  attempts: InviteAttemptLog;
  /** 활성 계정 상한 (FR-6 — 설정값이다). */
  maxAccounts: number;
}

export interface AuthUseCases {
  acceptInviteCode: AcceptInviteCode;
  checkInviteCode: CheckInviteCode;
  login: Login;
  refreshSession: RefreshSession;
  getAccount: GetAccount;
}

export const createAuthApplication = (deps: AuthDependencies) => {
  const useCases: AuthUseCases = {
    acceptInviteCode: new AcceptInviteCode(
      deps.invites,
      deps.accounts,
      deps.userCount,
      deps.hasher,
      deps.tokens,
      deps.attempts,
      deps.maxAccounts
    ),
    checkInviteCode: new CheckInviteCode(
      deps.invites,
      deps.userCount,
      deps.maxAccounts
    ),
    login: new Login(deps.accounts, deps.hasher, deps.tokens),
    refreshSession: new RefreshSession(deps.tokens),
    getAccount: new GetAccount(deps.accounts),
  };

  return { useCases };
};

export type { AcceptInviteCodeCommand, AcceptInviteCodeResult } from "../AcceptInviteCode";
export type { InviteCheckResult } from "../CheckInviteCode";
export type { LoginCommand, LoginResult } from "../Login";
