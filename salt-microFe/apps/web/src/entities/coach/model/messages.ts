import type {
  CoachAction,
  CoachMode,
  JudgmentBlockedReason,
  Zone,
} from "@repo/core/coach";

type HeldStageKey = Extract<Zone, { kind: "held_rule" }>["stages"][number]["key"];
type UnavailableReason = Extract<Zone, { kind: "unavailable" }>["reasonCode"];

/**
 * 코치 슬라이스의 사용자 노출 문구 (`i18n-policy.md`).
 *
 * **쓰지 않는 말**은 `FE-REQ-026` FR-113 · FR-116 과 제품 공통 수용 기준 §6 의 목록이다 —
 * 수용 기준이 이 파일 grep 0건이라 여기에 다시 적지 않는다. 가격 차이는 **위 · 아래**로만
 * 말한다 — 차이를 이득처럼 부르는 순간 예측이 된다.
 *
 * 서버 코드(`validity.code` · `ruleCode` · `blockedReason`)는 **여기서만** 문장이 된다.
 * 매핑이 없는 코드는 원문을 보여주지 않고 그 줄을 그리지 않는다.
 */
export const COACH_MESSAGES = {
  modeGroupLabel: "판단 관점",
  judgmentHeading: "지금의 판단",
  modes: { scalp: "단타", long_term: "장기" } satisfies Record<CoachMode, string>,
  validity: {
    scalp_24h: "판단 뒤 24시간 기준",
    long_term_30d: "판단 뒤 30일 기준",
  } as Record<string, string | undefined>,

  score: (score: number) => `점수 ${score} / 100`,
  /** 스크린리더용. "점수 72 / 100" 을 "72 슬래시 100" 으로 읽지 않게 (FR-13) */
  scoreAccessible: (score: number) => `100점 중 ${score}점`,
  reasonCount: (count: number) => `근거 ${count}`,
  trackSample: (count: number) => `이 판단 성적 ${count}회`,
  failureCount: (count: number) => `틀렸던 때 ${count}건`,
  lowSample: "표본 부족",

  blocked: {
    reasons_missing: "근거가 부족해 이번엔 판단을 보여 드리지 않아요.",
    signal_track_record_missing: "이 판단의 과거 성적이 아직 없어 보여 드리지 않아요.",
    failure_cases_missing: "틀렸던 사례 기록이 아직 없어 보여 드리지 않아요.",
    insufficient_sample: "과거 표본이 아직 적어 보여 드리지 않아요.",
  } satisfies Record<JudgmentBlockedReason, string>,
  blockedSample: (count: number) => `표본 ${count}건`,
  /** FR-2 — 막힌 판단은 고장이 아니다 */
  blockedNormal: "정상 동작이에요",

  /** 판단 조회 실패 · 모드 계약 깨짐. 구간 · 게이지 · 뉴스는 그대로 둔다 */
  judgmentUnavailable: "지금 판단을 불러올 수 없습니다.",
  signedOut: "로그인하면 이 종목의 판단을 볼 수 있습니다.",

  notPrediction: "예측 아님",
  zone: {
    heldRuleHeading: "내 규칙 가격",
    observationHeading: "관찰 구간",
    stages: {
      protect_loss: "손실 제한",
      first_profit: "1차 익절 검토",
      trend_hold: "추세 유지",
    } satisfies Record<HeldStageKey, string>,
    observation: { lower: "하단", mid: "중앙", upper: "상단" },
    /** `ruleCode` → 규칙 설명. p20 · p80 은 하위 · 상위 20% 다 */
    rules: {
      close_p20_p50_p80_d1_1y: "최근 1년 일봉 종가의 하위 20% · 중앙값 · 상위 20%",
      close_p20_p50_p80_m5_24h:
        "최근 24시간 5분봉 종가의 하위 20% · 중앙값 · 상위 20%",
    } as Record<string, string | undefined>,
    unavailable: {
      out_of_scope: "보유하지 않은 개별 주식은 구간을 제공하지 않습니다.",
      excluded_asset: "이 자산은 구간 계산에서 제외됩니다.",
      insufficient_price_history: "가격 이력이 부족해 구간을 계산하지 않습니다.",
    } satisfies Record<UnavailableReason, string>,
    price: (price: string) => `${price}원`,
    gapAbove: (gap: string) => `현재가보다 ${gap}원 위`,
    gapBelow: (gap: string) => `현재가보다 ${gap}원 아래`,
    gapNone: "현재가와 같음",
    /**
     * 차트 띠 이름표. **"매수존 · 바이존" 이라 쓰지 않는다**(`FEATURE-004` FR-21 — 화면 이름은 관찰 구간).
     * `예측 아님` 을 이름표에도 붙인다 — 칠한 띠는 선보다 "여기서 사라"로 읽히기 쉽다
     */
    bandLabel: (lower: string, upper: string) => `관찰 구간 ${lower} ~ ${upper} · 예측 아님`,
  },

  /** 차트 오버레이 범례 (`FE-REQ-026` FR-132) */
  overlay: {
    legendLabel: "차트의 구간 선",
  },

  /** 상세 분석 코치 카드 (`FE-REQ-026` FR-134) */
  detail: {
    heading: "코치 카드",
    reasonsHeading: "근거",
    risksHeading: "주의할 점",
    trackRecordHeading: "이 판단의 과거 성적",
    trackSample: (count: number) => `표본 ${count}회`,
    winRate: "적중률",
    avgReturn: "평균",
    worstObservedReturn: "가장 나빴던 수익률",
    horizon: (hours: number) => `판단 뒤 ${hours}시간 기준`,
    failureHeading: "맞았던 때 · 틀렸던 때",
    outcome: { hit: "맞음", miss: "틀림" },
    emptyValue: "—",
  },

  /** 수익 플랜 (`FE-REQ-026` FR-137). 보유 종목만 */
  profitPlan: {
    heading: "수익 플랜",
    caption: "보유 기록으로 정한 단계별 가격",
    columns: { stage: "단계", price: "가격", ratio: "비중" },
    status: {
      take_profit_review: "익절 검토 구간",
      stop_loss_review: "손실 제한 검토 구간",
      raise_stop_review: "손실 제한선 올리기 검토",
      hold_plan: "계획대로 보유",
    } as Record<string, string | undefined>,
    noHolding: "보유 기록이 없어 수익 플랜이 없습니다.",
  },

  /**
   * 코치 리포트 `/coach/report` (`FE-REQ-026` B~J · M).
   *
   * 행동은 **"검토"** 로 끝낸다 — 리포트의 추천도 지시가 아니라 검토 거리다. 행동 기록은
   * 수치로만 말한다(FR-61): 사람을 부르는 말 · 성향 이름을 붙이지 않는다.
   */
  report: {
    pageTitle: "코치 리포트",
    back: "투자",
    blockName: "코치 리포트",
    signedOut: "로그인하면 코치 리포트를 볼 수 있어요.",
    unavailable: "지금은 코치 리포트를 불러올 수 없어요. 잠시 뒤 다시 열어 주세요.",
    blockUnavailable: "이 항목을 지금은 불러올 수 없어요.",

    generatedAt: (at: string) => `${at}에 만들었어요`,
    notGenerated: "아직 만든 리포트가 없어요",
    stale: (hours: number) => `${hours}시간 지났어요`,
    aiBadge: "AI 생성",
    ruleBadge: "규칙 기반 설명",

    recommendationHeading: "코치 추천",
    /** FR-143 — 섹션 설명으로 늘 둔다. 막힌 추천이 오류가 아니라 정책이라는 것을 먼저 말한다 */
    recommendationPolicy: "과거 성적 · 틀렸던 사례가 없는 추천은 보여 드리지 않아요.",
    actions: {
      buy: "매수 검토",
      sell: "매도 검토",
      hold: "보유 유지 검토",
      rebalance: "비중 조정 검토",
    } satisfies Record<CoachAction, string>,
    /** 색과 글자에 모양을 더한다(FR-12 · FR-100). 스크린리더는 글자만 읽는다 */
    actionGlyphs: {
      buy: "▲",
      sell: "▼",
      hold: "■",
      rebalance: "◆",
    } satisfies Record<CoachAction, string>,
    reasonsHeading: "왜",
    factorsSummary: "근거 자세히 — 점수 기여도",
    factorScore: (score: number) => `${score > 0 ? "+" : ""}${score}`,
    trackRecordHeading: "이 유형 추천의 과거 성적",
    trackSample: (count: number) => `최근 ${count}회`,
    failureHeading: "틀렸던 때",
    noRecommendation: "아직 추천이 없어요. 보유 기록이 있으면 코치가 판단할 수 있어요.",
    /** 성적표 `signalType` → 이름 (FR-144). 매핑 없는 코드는 줄을 그리지 않는다 */
    signalTypes: {
      "coach.buy": "코치 추천 · 매수 검토",
      "coach.sell": "코치 추천 · 매도 검토",
      "coach.hold": "코치 추천 · 보유 유지 검토",
      "coach.rebalance": "코치 추천 · 비중 조정 검토",
    } as Record<string, string | undefined>,

    risksHeading: "주의할 점",
    noRisks: "지금 주의할 점은 없어요.",

    exitPlanHeading: "익절 플랜",
    exitPlanDescription: "내 보유 기록에 규칙을 적용한 가격이에요.",
    exitStages: { stopLoss: "손실 제한", firstTakeProfit: "1차 익절 검토", trendHold: "추세 유지" },
    currentPriceLabel: "현재가",
    /** `trendHold.conditionCode` → 조건 문장 (FR-45) */
    trendHoldConditions: {
      hold_or_trail_stop: "추세가 이어지는 동안 보유하고, 손실 제한선을 따라 올려요.",
    } as Record<string, string | undefined>,
    noHoldings: "보유 종목이 없어요.",

    behaviorHeading: "최근 거래 기록",
    noBehavior: "최근 거래에서 반복된 패턴은 없어요.",
    /**
     * `factCode` → 사실 문장 (FR-60 · FR-61). 재료는 서버 `params` 그대로 — 기간은 `period`,
     * 비율은 `rate` 로 포맷만 해서 받는다. 판정 임계(예: 매도 뒤 몇 % 이상)는 서버 값이라
     * 문장에 숫자로 박지 않는다.
     */
    behaviorFacts: {
      over_trading: (period: string, trades: number, threshold: number) =>
        `최근 ${period} 동안 ${trades}번 거래했어요. 기준은 ${threshold}번이에요.`,
      panic_sell: (period: string, sells: number, recovered: number, avgRate: string) =>
        `최근 ${period} 매도 ${sells}건 중 ${recovered}건은 지금 가격이 매도가보다 높아요. 평균 ${avgRate} 차이예요.`,
      chasing_high: (period: string, buys: number, nearHigh: number, ratio: string) =>
        `최근 ${period} 매수 ${buys}건 중 ${nearHigh}건은 최근 고가의 ${ratio} 이상 가격이었어요.`,
    },
    periodDays: (days: number) => `${days}일`,
    periodHours: (hours: number) => `${hours}시간`,
    amount: (amount: string) => `합계 ${amount}원`,

    /** 추천 대상에서 빠진 자산군 (FR-91). `assetType:reasonCode` */
    excluded: {
      "kr_stock:no_realtime_data": "국내주식은 실시간 시세와 지표가 없어 추천 대상이 아니에요.",
    } as Record<string, string | undefined>,

    disclaimerLabel: "유의사항",
  },

  gauge: {
    /** `40_60` → `40~60` */
    bucket: (code: string) => code.replace("_", "~"),
    sample: (bucket: string, count: number) => `이 구간(${bucket}) 과거 ${count}회`,
    distribution: (days: number, median: string, p25: string, p75: string) =>
      `${days}일 뒤 중앙값 ${median} (${p25} ~ ${p75})`,
  },
} as const;
