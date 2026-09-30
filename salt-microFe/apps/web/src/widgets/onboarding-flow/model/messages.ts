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
  completeTitle: "준비가 끝났어요",
  completeDescription: "홈에서 현재 상태를 확인해 보세요.",
  goHome: "홈으로",
  /** 단계 버튼 아래 — 지금 하지 않아도 된다 */
  laterToHome: "나중에 할게요",
  stepCount: (current: number, total: number) => `${total}단계 중 ${current}단계`,
  loading: "진행 상태를 불러오는 중…",
  /** 초대 수락 직후 다음 단계 위에 한 번 (`FE-REQ-044` P-3) */
  inviteAccepted: "초대를 수락했어요",
} as const;

/**
 * 단계 머리 장면 (`FE-REQ-044` P-20) — 초대 = 대화 · 거래 연결 = 장부 · 월 적립 = 동전 주머니.
 * `@repo/ui/illustration` 의 `scene` 이름이다.
 */
export const ONBOARDING_STEP_SCENE = {
  invite: "coachBubble",
  link_account: "ledger",
  set_plan: "coinPouch",
} as const satisfies Record<OnboardingStepKey, string>;

/**
 * 단계 이름. 순서는 BFF 가 주는 `steps` 순서와 같다.
 *
 * 서버 키는 `link_account` 지만 **계좌를 연결하지 않는다** — 거래는 전부 수동 입력이다(제품 결정).
 * 이 단계는 거래를 한 건 기록하면 끝나므로 이름도 그렇게 쓴다(2026-09-30 사용자 지적).
 */
export const ONBOARDING_STEP_LABELS: Record<OnboardingStepKey, string> = {
  invite: "초대 코드",
  link_account: "첫 거래 기록",
  set_plan: "첫 목표",
};

/**
 * 단계별 본문.
 *
 * `link_account` 는 거래를 한 건 기록하면, `set_plan` 은 목표를 추가하면 서버가 완료로 바꾼다.
 * 그래서 버튼은 **그 일을 하는 화면**으로 보낸다(거래 입력 · 목표 추가 화면이 이제 있다). 예전 문구의
 * "업비트 CSV · 증권사 연결"은 초기 기획의 흔적이었다 — 계좌 연동은 제품 범위에 없다.
 */
export const ONBOARDING_STEP_BODY: Record<
  OnboardingStepKey,
  { headline: readonly [string, string]; title: string; description: string; action?: string }
> = {
  invite: {
    // 투자만이 아니다 — 목표(goal)는 저축 · 돈 모으기 영역이고 앞으로 더 붙는다(2026-09-30 사용자)
    headline: ["투자도 저축도", "SALT 한곳에서"],
    title: "초대 코드를 입력해 주세요",
    description: "받으신 초대 코드로 계정을 만들어요.",
  },
  link_account: {
    headline: ["산 종목을 직접 적으면", "한눈에 볼 수 있어요"],
    title: "첫 거래를 기록해 주세요",
    description: "이미 한 거래를 한 건만 적어도 평단과 비중을 계산해 드려요. 계좌는 연결하지 않아요.",
    action: "거래 기록하러 가기",
  },
  set_plan: {
    headline: ["매달 조금씩", "모을 목표를 정해요"],
    title: "첫 목표를 정해 주세요",
    description: "목표 금액을 정하면 모은 돈과 남은 기간을 함께 보여 드려요.",
    action: "목표 정하러 가기",
  },
};

/** 끝 화면 두 줄 제목 */
export const ONBOARDING_COMPLETE_HEADLINE = ["준비가", "모두 끝났어요"] as const;

/** 홈 카드 (FR-25). 블록마다 안내하지 않고 **카드 하나**만 둔다. */
export const ONBOARDING_CARD_MESSAGES = {
  title: "설정을 마저 끝내주세요",
  cta: "이어서 하기",
  remaining: (count: number) => `남은 단계 ${count}개`,
} as const;
