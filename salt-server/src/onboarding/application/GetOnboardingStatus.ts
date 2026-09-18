/**
 * 온보딩 상태 — **조합 컨텍스트**의 유일한 유스케이스 (`SRV-REQ-008` FR-13·14).
 *
 * ## 왜 `auth` 가 아닌가
 *
 * 세 단계의 사실이 세 컨텍스트에 있다. `auth` 안에 두면 `auth` 가 원장과 적립 설정을
 * 알게 되고, 그건 경계가 이름만 남는 것이다 (`server-architecture.md` §2 — 조합 컨텍스트).
 *
 * ## 프로브가 Port 가 아닌 이유
 *
 * 조합 컨텍스트는 `domain` 을 갖지 않는다(훅이 막는다). Port 선언은 `domain` 의 일이므로
 * 여기서는 **`application` 이 받는 함수 타입**이고, 무엇을 꽂을지는 조립 지점이 정한다.
 *
 * ## 지금 꽂히는 것이 REQ 와 다르다
 *
 * FR-14 는 `ledger`(거래 존재)·`plan`(설정 존재)의 공개 API 를 쓰라고 했는데 **둘 다 아직
 * 없다**(F001·F003). 대신 `portfolio.countTransactions` 와 `goal` 행 존재를 꽂는다. 판정
 * 규칙은 여기 그대로 있고 **바뀌는 것은 조립 한 줄**이다 — 그게 이 구조의 값이다.
 */

export type OnboardingStepKey = "invite" | "link_account" | "set_plan";

export interface OnboardingStatus {
  complete: boolean;
  /** 첫 미완료 단계. 전부 끝났으면 `null`. */
  nextStep: OnboardingStepKey | null;
  steps: Array<{ key: OnboardingStepKey; done: boolean }>;
}

/** 거래 원장에 거래가 있는가. F001 이 서면 `ledger` 공개 API 가 답한다. */
export type LedgerLinkedProbe = (userId: string) => Promise<boolean>;

/** 월 적립 설정이 있는가. F003 이 서면 `plan` 공개 API 가 답한다. */
export type PlanConfiguredProbe = (userId: string) => Promise<boolean>;

export class GetOnboardingStatus {
  constructor(
    private readonly ledgerLinked: LedgerLinkedProbe,
    private readonly planConfigured: PlanConfiguredProbe
  ) {}

  async execute(userId: string): Promise<OnboardingStatus> {
    // 한 단계가 실패해도 나머지를 답한다 — 조립 응답의 원칙이다. 실패는 **미완료로**
    // 읽는다. 완료로 읽으면 안내가 사라져 사용자가 막힌 곳을 모른다.
    const [linked, configured] = await Promise.all([
      this.ledgerLinked(userId).catch(() => false),
      this.planConfigured(userId).catch(() => false),
    ]);

    // `invite` 는 조회하지 않는다. **인증된 요청이 도달했다는 것 자체가 초대를 통과했다는
    // 뜻**이다 — 계정이 생기는 경로가 `AcceptInviteCode` 하나뿐이기 때문에 성립한다.
    const steps: OnboardingStatus["steps"] = [
      { key: "invite", done: true },
      { key: "link_account", done: linked },
      { key: "set_plan", done: configured },
    ];

    const nextStep = steps.find((step) => !step.done)?.key ?? null;

    return { complete: nextStep === null, nextStep, steps };
  }
}
