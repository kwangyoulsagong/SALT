import type { AdherenceLabel, KnownMistakeTag } from "@repo/core/coach";

/**
 * F009 슬라이스 5 — 내 거래 미러 · 태그 · 입력 중 한 줄 문구 (`FE-REQ-039` FR-14~20 · `i18n-policy.md`).
 *
 * **본인 기록의 통계만 말한다.** "추격 매수를 줄이세요" 같은 지시 · "당신은 ~한 투자자" 같은 평가가 들어갈 자리가 없다 —
 * 숫자와 표본 수만 나란히 둔다(FEATURE-009 §통제하지 않는다). 숫자 문자열은 받은 그대로 끼운다.
 */
export const MIRROR_MESSAGES = {
  heading: "내 거래 미러",
  description: "내가 적은 거래로 센 통계예요. 표본이 20건보다 적으면 흐리게 보여요",
  signedOut: "로그인하면 내 거래 미러를 볼 수 있어요",
  unavailable: "지금은 내 거래 미러를 불러올 수 없어요",
  truncated: "거래가 너무 많아 일부 통계를 만들지 못했어요",
  empty: "매도 기록이 생기면 미러가 채워져요",

  sample: (count: number) => `표본 ${count}`,
  insufficientSample: "표본 부족",
  noData: "기록이 모자라 계산하지 못했어요",
  computedAt: (at: string) => `결과 기준 ${at}`,

  disposition: {
    label: "익절 · 손절",
    /** 보유일은 익절 · 손절 각각의 표본이다 — 합계 하나로 쓰면 "표본 24 · 표본 부족"처럼 모순돼 보인다 */
    sample: (gains: number, losses: number) => `익절 ${gains} · 손절 ${losses}`,
    holding: (gain: string, loss: string) => `익절은 평균 ${gain}일, 손절은 평균 ${loss}일 들고 있었어요`,
    ratio: (pgr: string, plr: string) => `이익 실현 비율 ${pgr} · 손실 실현 비율 ${plr}`,
  },
  benchmark: {
    label: "그냥 들고 있었으면",
    line: (hold: string, actual: string) => `처음 구성을 그대로 들고 있었으면 ${hold} · 실제 ${actual}`,
    fee: (fee: string) => `차이 중 수수료 몫 ${fee}`,
    period: (from: string, to: string) => `${from} ~ ${to}`,
  },
  adherence: {
    label: "계획 지킴",
    line: (total: number, honored: number, rate: string) => `판정한 계획 ${total}건 중 ${honored}건 계획대로(${rate})`,
    returns: (honored: string, violated: string) => `계획대로 한 거래 평균 ${honored} · 아닌 거래 평균 ${violated}`,
  },
  tags: {
    label: "실수 태그별 손익",
    cost: (tag: string, krw: string, count: number) => `${tag} ${krw}원 · ${count}건`,
    expectancyR: (value: string) => `평균 ${value}R`,
    expectancyReturn: (value: string) => `평균 ${value}`,
    noEdge: "엣지 없음",
  },
  turnover: {
    label: "회전율",
    line: (times: string, fees: string) => `최근 1년 ${times}배 · 올해 수수료 ${fees}원`,
    baseline: (source: string, period: string, rate: string) =>
      `참고: ${source}(${period}) 국내 주식 신규 개인 일 회전율 ${rate} — 시장 · 기간이 달라 나란히 두기만 해요`,
  },
  behavior: {
    label: "최근 행동",
    none: "최근 거래에서 반복된 패턴은 없어요",
  },

  tagNames: {
    chasing: "급등 추격",
    averaging_down: "물타기",
    revenge: "손실 뒤 재진입",
    off_plan: "계획 없음",
    late_night: "심야 거래",
  } satisfies Record<KnownMistakeTag, string>,

  outcomes: {
    heading: "청산별 태그",
    description: "서버가 붙인 태그는 후보예요. 고쳐서 확정하면 미러가 확정한 태그로 다시 세요",
    empty: "아직 청산한 거래가 없어요",
    unavailable: "지금은 청산 목록을 불러올 수 없어요",
    closedOn: (date: string) => `${date} 청산`,
    holdingDays: (days: string) => `${days}일 보유`,
    pnl: (krw: string) => `${krw}원`,
    rMultiple: (value: string) => `${value}R`,
    heldReturn: (value: string) => `30일 더 들고 있었으면 ${value}`,
    autoLabel: "자동 후보",
    confirmedLabel: "확정",
    noTags: "태그 없음",
    adherence: {
      honored: "계획대로",
      stop_not_honored: "손절가 아래에서 매도 기록 없음",
      stop_slipped: "손절가보다 낮게 매도",
      size_exceeded: "계획 수량 초과",
    } satisfies Record<AdherenceLabel, string>,
  },

  /** 거래 폼 아래 한 줄(FR-19 · 시나리오 5) — 차단 아님, 저장은 그대로 된다 */
  preview: {
    edge: (tag: string, count: number, expectancy: string) =>
      `이 거래는 '${tag}' 후보예요 · 내 기록에서 이 유형 ${count}건 ${expectancy}(엣지 없음)`,
    sellQuestion: "이 종목을 오늘 처음 본다면 살까요?",
    sellStopVsNow: (stop: string, now: string) => `계획 손절 ${stop}원 · 지금 ${now}원`,
    sellNowOnly: (now: string) => `지금 ${now}원`,
  },
} as const;
