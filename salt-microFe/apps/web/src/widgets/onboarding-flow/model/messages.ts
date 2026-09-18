import type { OnboardingStepKey } from "@/entities/auth";

/**
 * 온보딩 3스텝 문구.
 *
 * **그 외 질문을 두지 않는다** (`FE-REQ-010` FR-21). 스텝을 늘리고 싶어지면 그것은
 * 이 위젯이 아니라 제품 결정이고 `FEATURE-000` 을 먼저 고친다.
 */
export const ONBOARDING_MESSAGES = {
  title: "시작하기",
  stepperLabel: "온보딩 단계",
  completeTitle: "준비가 끝났습니다",
  completeDescription: "홈에서 현재 상태를 확인해 보세요.",
  goHome: "홈으로",
  loading: "진행 상태를 불러오는 중…",
} as const;

/** `ProgressStepper` 에 들어가는 라벨. 순서는 BFF 가 주는 `steps` 순서와 같다. */
export const ONBOARDING_STEP_LABELS: Record<OnboardingStepKey, string> = {
  invite: "초대 코드",
  link_account: "계좌 연결",
  set_plan: "월 적립액",
};

/**
 * 단계별 본문.
 *
 * `link_account` 와 `set_plan` 은 **안내만 한다.** 실제 연결(업비트 CSV · KIS)은
 * `ledger` 컨텍스트(F001)이고 적립 설정은 `plan`(F003)이라 화면이 아직 없다.
 * 없는 화면으로 보내는 버튼을 두지 않는 이유는, 눌러서 아무 일도 일어나지 않는 것이
 * "아직 준비 중"이라고 쓰는 것보다 나쁘기 때문이다.
 */
export const ONBOARDING_STEP_BODY: Record<
  OnboardingStepKey,
  { title: string; description: string; pending?: string }
> = {
  invite: {
    title: "초대 코드를 입력해 주세요",
    description: "받으신 코드로 계정을 만듭니다.",
  },
  link_account: {
    title: "거래 내역을 연결해 주세요",
    description: "업비트 CSV 또는 증권사 연결로 보유 종목을 가져옵니다.",
    pending: "연결 화면은 준비 중입니다. 거래가 기록되면 이 단계가 완료됩니다.",
  },
  set_plan: {
    title: "월 적립액을 정해 주세요",
    description: "매달 얼마를 모을지 정하면 계획을 만들어 드립니다.",
    pending: "적립 설정 화면은 준비 중입니다. 목표를 추가하면 이 단계가 완료됩니다.",
  },
};

/** 홈 카드 (FR-25). 블록마다 안내하지 않고 **카드 하나**만 둔다. */
export const ONBOARDING_CARD_MESSAGES = {
  title: "설정을 마저 끝내주세요",
  cta: "이어서 하기",
  remaining: (count: number) => `남은 단계 ${count}개`,
} as const;
