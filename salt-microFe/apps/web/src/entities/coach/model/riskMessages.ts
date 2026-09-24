import type {
  AdherenceLabel,
  GaugeStatus,
  SizingUnavailableReason,
} from "@repo/core/coach";

import type { DisclosureLines } from "@repo/ui/disclosureSlot";

/**
 * F009 거래 기록 · 계획 · 리스크 예산 문구 (`FE-REQ-039` · `i18n-policy.md`).
 *
 * **지시하지 않는다.** "비중을 줄이세요"가 아니라 "참고 비중 24% · 거래 후 31%" — 두 숫자만 나란히 둔다
 * (FEATURE-009 정책). 넘어도 막지 않는다 — "넘었어요"는 사실이고 경고 문구가 아니다.
 * 숫자 문자열은 받은 그대로 끼운다 — 이 파일은 금액을 만들지 않는다.
 */
export const RISK_MESSAGES = {
  /** FR-32 3종 고지 — 새 카드마다 고정 */
  disclosure: [
    "정보 제공 목적이에요",
    "개별 투자 상담이 아니에요",
    "원금 손실이 날 수 있어요",
  ] as DisclosureLines,
  disclosureLabel: "고지",

  size: {
    heading: "이 거래의 크기",
    maxLoss: (krw: string) => `손절까지 가면 최대 −${krw}원`,
    perTradeBudget: (rate: string) => `1회 손실 한도의 ${rate}`,
    monthlyRemaining: (rate: string) => `이번 달 남은 손실 예산의 ${rate}`,
    weights: (reference: string, projected: string) => `변동성 기준 참고 비중 ${reference} · 거래 후 ${projected}`,
    projectedOnly: (projected: string) => `거래 후 비중 ${projected}`,
    referenceQuantity: (quantity: string, by: "per_trade_budget" | "single_asset_weight") =>
      by === "per_trade_budget" ? `1회 한도 기준 참고 수량 최대 ${quantity}개` : `종목 상한 기준 참고 수량 최대 ${quantity}개`,
    streak: (count: number, krw: string) => `이 크기로 ${count}번 연속 손절이면 −${krw}원`,
    streakOfBudget: (rate: string) => `(월 예산의 ${rate})`,
    assumptions: (feeRate: string) => `편도 수수료 ${feeRate} 포함 · 가격이 손절가를 건너뛰는 경우는 반영하지 않았어요`,
    targetVolDefault: (rate: string) => `목표 변동성 ${rate}(기본값)`,
    calculating: "계산하는 중",
    unavailable: "지금은 계산할 수 없어요. 저장은 그대로 할 수 있어요",
    stopNotBelowEntry: "손절가가 단가보다 높거나 같아요",
    reasons: {
      stop_price_missing: "손절가를 적으면 손실 크기를 계산해요",
      stop_not_below_entry: "손절가가 단가보다 높거나 같아요",
      budget_not_set: "손실 예산을 정하면 비율을 보여 드려요",
      no_portfolio_value: "보유 기록이 생기면 비중을 보여 드려요",
      monthly_budget_exhausted: "이번 달 손실 예산을 이미 다 썼어요",
      insufficient_data: "변동성 데이터를 준비하고 있어요",
      not_applicable_sell: "매도는 손실 크기를 계산하지 않아요",
    } satisfies Record<SizingUnavailableReason, string>,
  },

  gauge: {
    heading: "리스크 예산",
    description: "이번 달 손실 · 한 종목 쏠림 · 거래 빈도를 내 기준과 나란히 봐요. 넘어도 아무것도 막지 않아요",
    drawdown: "이번 달 손실 예산",
    /** `used` 는 부호까지 붙여 넘긴다(0 이면 부호 없음) */
    drawdownValue: (used: string, budget: string) => `${used}원 / ${budget}원`,
    concentration: "종목 집중도",
    concentrationValue: (symbol: string, weight: string, limit: string) => `${symbol} ${weight} · 내 상한 ${limit}`,
    turnover: "최근 1년 회전율",
    turnoverValue: (times: string) => `${times}배`,
    turnoverDetail: (fees: string, count: number) => `올해 수수료 ${fees}원 · 거래 ${count}건`,
    usedRate: (rate: string) => `${rate} 사용`,
    exceeded: "기준을 넘었어요",
    status: {
      ok: "",
      exceeded: "기준을 넘었어요",
      budget_not_set: "기준을 정하면 보여요",
      insufficient_data: "데이터가 모자라 계산하지 못했어요",
    } satisfies Record<GaugeStatus, string>,
    missingCloses: (symbols: string) => `월초 종가가 없는 종목: ${symbols}`,
    signedOut: "로그인하면 내 리스크 예산을 볼 수 있어요",
    unavailable: "지금은 리스크 예산을 불러올 수 없어요",
    progressLabel: (name: string) => `${name} 사용률`,
  },

  plan: {
    heading: "내 계획",
    empty: "아직 적은 계획이 없어요. 거래를 기록할 때 손절가와 이유를 함께 적을 수 있어요",
    stop: "손절가",
    thesis: "이유",
    noStop: "손절가 없음",
    daysSince: (days: number) => `D+${days}`,
    plannedOn: (date: string) => `${date} 작성`,
    price: (amount: string) => `${amount}원`,
    currentPrice: "현재가",
    locked: "거래와 연결됨",
    side: { buy: "매수", sell: "매도" },
    adherence: {
      honored: "계획대로",
      stop_not_honored: "손절가 아래에서 매도 기록 없음",
      stop_slipped: "손절가보다 낮게 매도",
      size_exceeded: "계획 수량 초과",
    } satisfies Record<AdherenceLabel, string>,
    unavailable: "지금은 계획을 불러올 수 없어요",
    more: (count: number) => `이전 계획 ${count}건`,
  },
} as const;
