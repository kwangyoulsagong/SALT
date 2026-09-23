/**
 * 로그인 · 초대 수락이 주는 사용자 (`SRV-REQ-008` `AccountView`).
 *
 * `id` 가 `number` 였다 — MSW 목 응답(`id: 1`)을 따른 모양이고 서버는 uuid 문자열을 준다.
 * 목이 계약을 정하고 있던 자리다(2026-09-23 정정).
 */
export interface User {
  id: string;
  nickname: string;
  email: string;
  profileImageUrl?: string | null;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

/** 이 슬라이스가 store 에 붙는 자리. 셀렉터가 이 가지만 본다. */
export interface AuthRootState {
  auth: AuthState;
}

/**
 * 온보딩 3스텝 (`BFF-REQ-008` `OnboardingStatusViewModel`).
 *
 * ## 타입을 BFF 와 프론트가 두 벌 갖는 이유
 *
 * 계약의 주인은 BFF 다. 그런데 `bff` 는 pnpm workspace 밖의 독립 npm 프로젝트라
 * `@repo/core` 를 import 할 수 없다 — `entities/market/model/types.ts` 가 관심 목록
 * 뷰모델에 대해 같은 상황을 적어 둔 것과 같다. 한 벌로 합치는 것은 `FE-REQ-024` 의 일이다.
 *
 * **그때까지는 BFF 뷰모델이 진실이고 이 타입이 그것을 따라간다.**
 */
export type OnboardingStepKey = "invite" | "link_account" | "set_plan";

export interface OnboardingStep {
  key: OnboardingStepKey;
  done: boolean;
}

export interface OnboardingStatus {
  complete: boolean;
  /** 첫 미완료 단계. 전부 끝났으면 `null`. */
  nextStep: OnboardingStepKey | null;
  /** 항상 세 칸이다. BFF 가 빠진 단계를 미완료로 채워 준다. */
  steps: OnboardingStep[];
}
