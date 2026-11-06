import type { OnboardingDomain } from "@/entities/auth";

/**
 * 도메인 고르기 문구(`FE-REQ-055` FR-4 · FR-8). 이름은 기획서 그대로 — 모으기 · 쓰는 돈 · 투자.
 * 권하지 않는다(칭찬 · 재촉 0) · "연결 · 연동" 0 — 거래는 전부 직접 적는다.
 */
export const CHOOSE_DOMAINS_MESSAGES = {
  legend: "쓰고 싶은 것을 골라 주세요",
  hint: "여러 개 골라도 돼요. 나중에 다시 고를 수 있어요",
  submit: "다음",
  failed: "저장하지 못했어요. 잠시 뒤 다시 눌러 주세요",
  domains: {
    savings: { label: "모으기", hint: "목표를 정하고 모은 돈을 적어요" },
    household: { label: "쓰는 돈", hint: "지출을 적고 이번 달 흐름을 봐요" },
    invest: { label: "투자", hint: "산 종목을 적고 평단과 비중을 봐요" },
  } satisfies Record<OnboardingDomain, { label: string; hint: string }>,
} as const;
