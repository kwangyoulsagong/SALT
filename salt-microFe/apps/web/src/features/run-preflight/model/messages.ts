import type { PreflightWarningCode } from "@repo/core/coach";

/**
 * 주문 전 체크 문구 (F004 FR-30 · `FE-REQ-026` FR-150~156 · `i18n-policy.md`).
 *
 * **주문 화면이 아니다** — 사라 · 팔라는 말이 없고, 넘어도 막지 않는다(FR-156). 끝 문구는 "직접 주문"뿐이다(FR-150).
 * 비중의 분모는 **보유 코인 평가금 + 이번 금액**이다(서버 `CheckTradePreflight` 가 코인만 본다) — "총자산"이라 부르지 않는다.
 */
export const RUN_PREFLIGHT_MESSAGES = {
  heading: "주문 전 체크",
  description: "사기 전에 크기와 손실을 계산만 해요. 주문은 나가지 않아요",
  heroLink: "주문 전 체크",
  openSheet: "주문 전 체크 열기",
  amountLabel: "금액",
  amountChipsLabel: "금액 고르기",
  amountCustomLabel: "금액 직접 입력",
  amountUnit: "원",
  entryLabel: "진입가",
  useLivePrice: "현재가",
  useLivePriceLabel: "진입가에 현재가 넣기",
  stopLabel: "손절",
  stopChipsLabel: "손절 비율 고르기",
  targetLabel: "목표가",
  targetPlaceholder: "선택",
  idleHint: "금액과 진입가를 정하면 계산해요",
  calculating: "계산하는 중",
  unavailable: "지금은 계산할 수 없어요. 잠시 뒤 다시 열어 주세요",
  signedOut: "로그인하면 내 보유 기준으로 계산해요",
  invalidAmount: "0보다 큰 숫자를 적어 주세요",
  result: {
    projectedWeight: (weight: string) => `진입 후 이 종목 비중 ${weight}`,
    withinCap: (cap: string) => `상한 ${cap} 안`,
    overCap: (cap: string) => `상한 ${cap} 넘음`,
    maxLoss: (stop: string, loss: string) => `손절가 ${stop}원에서 최대 손실 ${loss}원`,
    maxLossOfTotal: (rate: string) => `보유 코인 전체(이번 금액 포함) 대비 ${rate}`,
    noStop: "손절을 고르면 최대 손실을 계산해요",
    riskReward: (target: string, ratio: string) => `목표가 ${target}원까지 손익비 ${ratio}`,
    noTarget: "목표가를 넣으면 손익비를 계산해요",
  },
  /** 서버 경고 코드 → 문장. 서버 `message` 는 읽지 않는다(`api-convention.md`) */
  warnings: {
    missing_stop_price: "손절 기준이 없으면 한 번에 잃을 수 있는 크기를 알 수 없어요",
    weak_risk_reward: "손익비가 최소 기준보다 낮은 조건이에요",
    concentration_risk: "이 금액이면 한 종목 상한을 넘어요. 막지는 않아요",
    stale_price: "시세 갱신이 늦어 지금 가격과 다를 수 있어요",
  } satisfies Record<PreflightWarningCode, string>,
  closing: "계산만 했어요. 주문은 거래소에서 직접 하세요",
} as const;
