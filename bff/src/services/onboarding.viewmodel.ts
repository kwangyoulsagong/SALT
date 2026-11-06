/**
 * 온보딩 뷰모델 — 도메인 선택(`BFF-REQ-046` FR-6 · `SRV-REQ-048` FR-1, 서버 S3a 2026-11-06).
 *
 * 옛 3스텝(초대 · 첫 거래 · 첫 목표)은 은퇴했다 — 투자를 안 고른 사람에게도 "첫 거래"를 묻던 길이다(FEATURE-015 FR-1).
 * 이제 **고르기 → 고른 도메인 첫 입력 하나 → 끝**. 다음 단계 · 첫 입력 도메인은 서버(identity)가 정하고, BFF 는 도메인 키를
 * 화면 경로로만 바꾼다(카드 `href` 와 같은 표 — `home-card.viewmodel.ts`). **모르는 값은 버린다** — 서버가 도메인을 늘려도
 * 화면이 모르는 키가 흘러 들어가지 않게.
 */

import { HOUSEHOLD_HREF, INVEST_HREF, SAVINGS_HREF } from "./home-card.viewmodel";

export type OnboardingDomain = "savings" | "household" | "invest";

export type OnboardingStep = "choose_domains" | "first_input";

export interface OnboardingViewModel {
  /** 끝났으면 null */
  nextStep: OnboardingStep | null;
  complete: boolean;
  /** 고를 수 있는 도메인(서버 순서) · 지금 골라져 있나 */
  choices: Array<{ domain: OnboardingDomain; selected: boolean }>;
  /** 첫 입력 — 고른 것 중 서버가 정한 하나. 고르기 전이면 null */
  firstInput: { domain: OnboardingDomain; href: string } | null;
}

/** 첫 입력 화면 — 저축 = 목표 만들기 · 가계부 = 지출 적기 · 투자 = 투자 첫 화면(종목을 골라 거래를 적는다) */
export const FIRST_INPUT_HREF: Record<OnboardingDomain, string> = {
  savings: `${SAVINGS_HREF}/new`,
  household: `${HOUSEHOLD_HREF}/new`,
  invest: INVEST_HREF,
};

const DOMAINS = Object.keys(FIRST_INPUT_HREF) as OnboardingDomain[];
const STEPS: OnboardingStep[] = ["choose_domains", "first_input"];

const isDomain = (v: unknown): v is OnboardingDomain => typeof v === "string" && (DOMAINS as string[]).includes(v);

/** identity `GET /api/identity/shell` 의 `data` */
export interface ServerShell {
  chosenDomains?: unknown;
  choosableDomains?: unknown;
  onboarding?: { nextStep?: unknown; complete?: unknown; firstInputDomain?: unknown };
  layout?: { order?: unknown; hidden?: unknown; saved?: unknown };
}

const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

export const toOnboardingViewModel = (server: ServerShell | undefined): OnboardingViewModel => {
  const chosen = new Set(list(server?.chosenDomains).filter(isDomain));
  const choosable = list(server?.choosableDomains).filter(isDomain);
  const step = server?.onboarding?.nextStep;
  const nextStep = typeof step === "string" && (STEPS as string[]).includes(step) ? (step as OnboardingStep) : null;
  const first = server?.onboarding?.firstInputDomain;
  return {
    nextStep,
    // 끝은 서버가 말할 때만 — 모르는 단계를 "끝"으로 접으면 고르지 않은 사람이 온보딩을 건너뛴다
    complete: server?.onboarding?.complete === true && nextStep === null,
    choices: (choosable.length > 0 ? choosable : DOMAINS).map((domain) => ({ domain, selected: chosen.has(domain) })),
    firstInput: isDomain(first) ? { domain: first, href: FIRST_INPUT_HREF[first] } : null,
  };
};
