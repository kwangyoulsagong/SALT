import type { OnboardingDomain } from "@/entities/auth";

/**
 * 온보딩 문구 — 도메인 선택(`FE-REQ-055` FR-4, 서버 S3a 2026-11-06). 옛 3스텝(초대 · 첫 거래 · 첫 목표)은 은퇴했다 —
 * 투자를 안 고른 사람에게도 "첫 거래"를 묻던 길이다(FEATURE-015 FR-1).
 *
 * **그 외 질문을 두지 않는다** (`FE-REQ-010` FR-21). 단계를 늘리고 싶어지면 그것은 이 위젯이 아니라 제품 결정이고
 * `FEATURE-015` 를 먼저 고친다. 칭찬 · 재촉 0 · "연결 · 연동" 0(FR-8).
 */
export const ONBOARDING_MESSAGES = {
  stepperLabel: "온보딩 단계",
  completeDescription: "홈에서 고른 것부터 볼 수 있어요.",
  goHome: "홈으로",
  /** 첫 입력 버튼 아래 — 지금 하지 않아도 된다 */
  laterToHome: "나중에 할게요",
  loading: "진행 상태를 불러오는 중…",
  loadFailed: "진행 상태를 불러오지 못했어요. 잠시 뒤 다시 열어 주세요",
  finishFailed: "넘어가지 못했어요. 잠시 뒤 다시 눌러 주세요",
  /** 초대 수락 직후 다음 단계 위에 한 번 (`FE-REQ-044` P-3) */
  inviteAccepted: "초대를 수락했어요",
} as const;

/** 화면 단계 — 초대(세션 없을 때) · 고르기 · 첫 입력 · 끝. 서버 단계(`choose_domains` · `first_input`)에 초대 · 끝을 더한 것 */
export type OnboardingScreen = "invite" | "choose_domains" | "first_input" | "complete";

/** 점 진행 표시 순서 — 끝은 점이 아니다 */
export const ONBOARDING_SCREEN_ORDER = ["invite", "choose_domains", "first_input"] as const;

export const ONBOARDING_SCREEN_LABELS: Record<(typeof ONBOARDING_SCREEN_ORDER)[number], string> = {
  invite: "초대 코드",
  choose_domains: "쓸 것 고르기",
  first_input: "첫 기록",
};

/** 단계 머리 장면 (`FE-REQ-044` P-20) — `@repo/ui/illustration` 의 `scene` 이름 */
export const ONBOARDING_SCREEN_SCENE = {
  invite: "coachBubble",
  choose_domains: "coinPouch",
  first_input: "ledger",
} as const satisfies Record<(typeof ONBOARDING_SCREEN_ORDER)[number], string>;

export const ONBOARDING_SCREEN_BODY: Record<
  (typeof ONBOARDING_SCREEN_ORDER)[number],
  { headline: readonly [string, string]; description: string }
> = {
  invite: {
    // 투자만이 아니다 — 모으기 · 쓰는 돈 · 투자(2026-09-30 · 10-30 사용자)
    headline: ["모으고 쓰고 불리는 돈", "SALT 한곳에서"],
    description: "받으신 초대 코드로 계정을 만들어요.",
  },
  choose_domains: {
    headline: ["무엇부터", "같이 볼까요"],
    description: "고른 것만 홈에 보여요. 고르지 않은 것은 묻지 않아요.",
  },
  first_input: {
    headline: ["하나만 적으면", "시작할 수 있어요"],
    description: "지금 한 건 적어 두면 바로 숫자로 보여 드려요.",
  },
};

/** 첫 입력 버튼 — 고른 도메인 중 서버가 정한 하나. 경로는 BFF 가 준다 */
export const FIRST_INPUT_ACTION: Record<OnboardingDomain, string> = {
  savings: "첫 목표 정하러 가기",
  household: "첫 지출 적으러 가기",
  invest: "첫 거래 적으러 가기",
};

/** 끝 화면 두 줄 제목 */
export const ONBOARDING_COMPLETE_HEADLINE = ["준비가", "끝났어요"] as const;

/** 홈 카드 (FR-25). 블록마다 안내하지 않고 **카드 하나**만 둔다. */
export const ONBOARDING_CARD_MESSAGES = {
  title: "시작하기를 마저 끝내 주세요",
  cta: "이어서 하기",
} as const;
