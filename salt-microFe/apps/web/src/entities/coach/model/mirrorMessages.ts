import type { AdherenceLabel, KnownMistakeTag, TimeBand, Weekday } from "@repo/core/coach";

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
  /** 손실 비대칭(F010 슬라이스 3 · `FE-REQ-040` FR-4). 측정만 — 좋다 · 나쁘다를 말하지 않는다 */
  lossAsymmetry: {
    label: "가장 큰 손실 ÷ 가장 큰 이익",
    line: (ratio: string) => `${ratio}배`,
    amounts: (window: number, loss: string, gain: string) => `최근 청산 ${window}건 중 가장 큰 손실 ${loss}원 · 가장 큰 이익 ${gain}원`,
    hint: "1 보다 크면 가장 큰 손실이 가장 큰 이익보다 컸다는 뜻이에요",
    oneSided: (window: number) => `최근 청산 ${window}건에 이익 · 손실이 둘 다 있어야 계산해요`,
  },
  turnover: {
    label: "회전율",
    line: (times: string, fees: string) => `최근 1년 ${times}배 · 올해 수수료 ${fees}원`,
    baseline: (source: string, period: string, rate: string) =>
      `참고: ${source}(${period}) 국내 주식 신규 개인 일 회전율 ${rate} — 시장 · 기간이 달라 나란히 두기만 해요`,
  },
  /** 계획에 적은 "오를 확률" 채점(FR-13, 슬라이스 6). 성적 4요소 — 기간 · 표본 · 기준 대비 · 빗나간 사례(FR-33) */
  brier: {
    label: "내 '오를 확률' 채점",
    line: (score: string, baseline: string) =>
      `평균 점수 ${score} · 늘 50%라고 적었다면 ${baseline} (0에 가까울수록 잘 맞았어요)`,
    counts: (missed: number, pending: number) => `빗나간 계획 ${missed}건 · 아직 복기일 전 ${pending}건`,
    miss: (symbol: string, probability: string, from: string, to: string, up: boolean) =>
      `${symbol} 오를 확률 ${probability}라고 적었는데 ${up ? "올랐어요" : "오르지 않았어요"} (${from} → ${to})`,
  },
  /** 연승 · 연패(FR-20, 슬라이스 7). 패턴 문장은 서버가 관찰됐다고 할 때만 */
  streak: {
    label: "연승 · 연패",
    currentWin: (count: number) => `지금 ${count}연승이 이어지고 있어요`,
    currentLoss: (count: number) => `지금 ${count}연패가 이어지고 있어요`,
    none: "지금 이어지는 연승 · 연패는 없어요",
    longest: (win: number, loss: number) => `가장 길었던 연승 ${win} · 연패 ${loss}`,
    afterWins: (length: number, ratio: string, count: number) =>
      `${length}연승 뒤 매수 금액이 평소의 ${ratio}배였어요 (매수 ${count}건)`,
    afterLosses: (length: number, ratio: string, count: number) =>
      `${length}연패 뒤 매수 금액이 평소의 ${ratio}배였어요 (매수 ${count}건)`,
    basis: "매수 금액으로 비교했어요 · 자본이 늘어난 몫은 가르지 않았어요",
  },
  /** 진입 시간대 · 요일(FR-22, 슬라이스 7) */
  timing: {
    label: "진입 시간대 · 요일",
    row: (name: string, count: number, win: string, avg: string, krw: string) =>
      `${name} ${count}건 · 이익 ${win} · 평균 ${avg} · ${krw}원`,
    missing: "—",
    untimed: (count: number) => `날짜만 적은 거래 ${count}건은 시간대에서 뺐어요`,
    bands: {
      dawn: "새벽(0~6시)",
      morning: "오전(6~12시)",
      afternoon: "오후(12~18시)",
      evening: "저녁(18~24시)",
    } satisfies Record<TimeBand, string>,
    weekdays: {
      mon: "월요일",
      tue: "화요일",
      wed: "수요일",
      thu: "목요일",
      fri: "금요일",
      sat: "토요일",
      sun: "일요일",
    } satisfies Record<Weekday, string>,
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

/**
 * F009 슬라이스 6 — 월간 복기 문구 (`FE-REQ-039` FR-21 · FEATURE-009 FR-28). 미러와 같은 원칙 — 숫자와 표본만, 지시 없음.
 * "이번 달 한 가지" 문장은 서버 템플릿이라 여기 없다.
 */
export const REVIEW_MESSAGES = {
  heading: "월간 복기",
  description: "한 달이 끝나면 그달 기록을 한 번 정리해 둬요. 뒤에 태그를 고쳐도 이 복기는 그대로예요",
  monthSelect: "복기할 달",
  month: (year: string, month: string) => `${year}년 ${Number(month)}월`,
  generatedAt: (at: string) => `${at}에 정리했어요`,
  signedOut: "로그인하면 월간 복기를 볼 수 있어요",
  unavailable: "지금은 월간 복기를 불러올 수 없어요",
  status: {
    month_not_closed: "이 달은 아직 끝나지 않았어요. 다음 달 1일에 정리돼요",
    no_ledger: "그달까지 적은 거래가 없어요",
    truncated: "거래가 너무 많아 복기를 만들지 못했어요",
  },
  oneThing: "이번 달 한 가지",
  activity: {
    label: "그달 거래",
    line: (trades: number, buys: number, sells: number) => `거래 ${trades}건 · 매수 ${buys} · 매도 ${sells}`,
    closed: (count: number) => `청산 ${count}건`,
  },
  topMistake: {
    label: "비용이 가장 컸던 태그",
    line: (tag: string, krw: string, count: number) => `${tag} ${krw}원 · ${count}건`,
  },
  ips: {
    label: "내 기준을 넘은 날",
    line: (days: number, observed: number) => `${observed}일 중 ${days}일`,
    loss: (days: number) => `월 손실 예산을 넘은 날 ${days}일`,
    lossNotSet: "월 손실 예산은 정하지 않았어요",
    lossUnavailable: "월 손실 예산은 월초 평가금이 없어 세지 못했어요",
    concentration: (days: number, limit: string) => `한 종목 비중이 상한 ${limit}보다 컸던 날 ${days}일`,
    basis: "지금 정해 둔 기준으로 셌어요",
  },
  turnover: {
    label: "그달 회전율",
    line: (times: string, fees: string) => `${times}배 · 수수료 ${fees}원`,
  },
  observedDays: (days: number) => `관찰 ${days}일`,
} as const;
