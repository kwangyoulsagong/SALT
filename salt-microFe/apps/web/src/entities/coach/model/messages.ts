import type {
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
    scalp_5m_24h: "유효 5분~24시간",
    long_term_1w_1y: "유효 1주~1년",
  } as Record<string, string | undefined>,

  score: (score: number) => `점수 ${score} / 100`,
  /** 스크린리더용. "점수 72 / 100" 을 "72 슬래시 100" 으로 읽지 않게 (FR-13) */
  scoreAccessible: (score: number) => `100점 중 ${score}점`,
  reasonCount: (count: number) => `근거 ${count}`,
  trackSample: (count: number) => `이 판단 성적 ${count}회`,
  failureCount: (count: number) => `틀렸던 때 ${count}건`,
  lowSample: "표본 부족",

  blocked: {
    reasons_missing: "근거가 부족해 판단을 표시하지 않습니다.",
    signal_track_record_missing:
      "이 판단의 과거 성적 데이터가 아직 없어 판단을 표시하지 않습니다.",
    failure_cases_missing:
      "틀렸던 사례 기록이 아직 없어 판단을 표시하지 않습니다.",
    insufficient_sample: "과거 표본이 아직 적어 판단을 표시하지 않습니다.",
  } satisfies Record<JudgmentBlockedReason, string>,
  blockedSample: (count: number) => `표본 ${count}건`,
  /** FR-2 — 막힌 판단은 고장이 아니다 */
  blockedNormal: "이것은 정상 동작입니다.",

  /** 판단 조회 실패 · 모드 계약 깨짐. 구간 · 게이지 · 뉴스는 그대로 둔다 */
  judgmentUnavailable: "지금 판단을 불러올 수 없습니다.",
  signedOut: "로그인하면 이 종목의 판단을 볼 수 있습니다.",

  notPrediction: "예측 아님",
  /** ⑦ (`FE-REQ-026` FR-119) */
  openDetail: "상세 분석 보기 →",
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
    maxDrawdown: "최대 낙폭",
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

  gauge: {
    /** `40_60` → `40~60` */
    bucket: (code: string) => code.replace("_", "~"),
    sample: (bucket: string, count: number) => `이 구간(${bucket}) 과거 ${count}회`,
    distribution: (days: number, median: string, p25: string, p75: string) =>
      `${days}일 뒤 중앙값 ${median} (${p25} ~ ${p75})`,
  },
} as const;
