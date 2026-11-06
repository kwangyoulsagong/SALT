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
 * 온보딩 — 도메인 선택(`BFF-REQ-046` FR-6 `OnboardingViewModel`, 서버 S3a 2026-11-06). 옛 3스텝(초대 · 첫 거래 · 첫 목표)은 은퇴했다.
 *
 * ## 타입을 BFF 와 프론트가 두 벌 갖는 이유
 *
 * 계약의 주인은 BFF 다. 그런데 `bff` 는 pnpm workspace 밖의 독립 npm 프로젝트라
 * `@repo/core` 를 import 할 수 없다 — `entities/market/model/types.ts` 가 관심 목록
 * 뷰모델에 대해 같은 상황을 적어 둔 것과 같다. 한 벌로 합치는 것은 `FE-REQ-012` FR-50 의 일이다.
 *
 * **그때까지는 BFF 뷰모델이 진실이고 이 타입이 그것을 따라간다.**
 */
export type OnboardingDomain = "savings" | "household" | "invest";

/** 로그인 뒤 단계. 초대(계정 만들기)는 세션이 없을 때 화면이 그리는 단계라 서버 값이 아니다 */
export type OnboardingStep = "choose_domains" | "first_input";

export interface Onboarding {
  /** 끝났으면 `null` */
  nextStep: OnboardingStep | null;
  complete: boolean;
  /** 고를 수 있는 도메인(서버 순서) · 지금 골라져 있나 */
  choices: Array<{ domain: OnboardingDomain; selected: boolean }>;
  /** 첫 입력 — 고른 것 중 서버가 정한 하나와 그 화면. 고르기 전이면 `null` */
  firstInput: { domain: OnboardingDomain; href: string } | null;
}
