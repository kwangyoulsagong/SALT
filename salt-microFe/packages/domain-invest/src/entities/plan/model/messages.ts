import type { KimchiLevel, PlanAsset, PlanIndicator, PlanReasonCode } from "./types";

/**
 * 밴드 적립 문구(F003 v2 · `FE-REQ-022` 개정 2026-11-19). 서버는 코드 · 수치만 준다 — 문장은 여기 한 곳.
 * 사실만 적는다: "넣으세요" 대신 "계획" · 0배에서도 파는 말 0 · 김프는 비용 사실만(차익거래 안내 0) · 미실행은 평가 없이 수
 */
export const PLAN_MESSAGES = {
  title: "적립",
  heading: "이번 주 적립",
  loading: "이번 주 계획을 불러오는 중이에요",
  loadFailed: "이번 주 계획을 불러오지 못했어요",
  retry: "다시 불러오기",
  amount: (formatted: string) => `${formatted}원`,
  times: (multiplier: string) => `${multiplier}배`,
  totalLabel: "이번 주 적립 계획",
  totalAria: (formatted: string) => `이번 주 적립 계획 ${formatted}원`,
  weekOf: (date: string) => `${date} 주`,
  provisional: "잠정 — 이번 주 예측이 나오면 바뀔 수 있어요",

  notConfiguredTitle: "월 적립액을 정하면 이번 주 금액이 나와요",
  notConfiguredBody: "비트코인 · 코스피에 반씩 나눠 매주 금액으로 바꿔요. 밴드 효과가 검산으로 확인된 자산만 배수가 붙어요.",

  asset: { btc: "비트코인", kospi: "코스피" } satisfies Record<PlanAsset, string>,
  indicator: { mvrv_z: "MVRV Z", per_percentile: "코스피 PER" } satisfies Record<PlanIndicator, string>,
  /** 사전등록 밴드 키(`band-accumulation@2`) — 모르는 키는 키 그대로 */
  band: {
    extreme_low: "아주 낮음",
    low: "낮음",
    neutral: "보통",
    high: "높음",
    extreme_high: "아주 높음",
  } as Record<string, string>,

  breakdown: (base: string, multiplier: string, amount: string) => `기본 ${base}원 × ${multiplier}배 = ${amount}원`,
  noNewThisWeek: "이번 주 신규 적립 계획 없음",
  reason: {
    band_applied: "과거 검산에서 정액보다 나았던 밴드라 배수를 붙였어요",
    gate_not_passed: "과거 검산에서 정액보다 낫다고 보기 어려워 정액(1배)으로 계획했어요 — 밴드 효과 미검증",
    band_pending: "이번 주 예측 전이라 지금은 정액이에요",
    band_unavailable: "그 주 예측이 없어 정액으로 계획했어요",
  } satisfies Record<PlanReasonCode, string>,

  basisHeading: "근거",
  basisValue: (indicator: string, value: string) => `${indicator} ${value}`,
  percentileValue: (pct: string) => `하위 ${pct}%`,
  estimated: (month: string) => `추정 — ${month} PER × 지수 변화(이익 고정)`,
  observedAt: (date: string) => `기준 ${date}`,
  dividend: (pct: string) => `배당수익률 ${pct}% · 배수에 쓰지 않아요`,
  currentBand: (band: string, multiplier: string) => `지금 밴드 ${band} · 밴드 배수 ${multiplier}배`,
  bandOffNote: "관문이 꺼져 있어 이 배수는 금액에 쓰지 않았어요",
  stale: (days: number) => `지표 ${days}일 전 값`,

  bandTable: {
    caption: (asset: string) => `${asset} 밴드 표 — 사전등록 값, 바꿀 수 없어요`,
    range: "구간",
    band: "밴드",
    multiplier: "배수",
    current: "지금",
    below: (v: string) => `${v} 미만`,
    between: (lo: string, hi: string) => `${lo} 이상 ${hi} 미만`,
    above: (v: string) => `${v} 이상`,
  },

  track: {
    heading: "과거 성적",
    what: "밴드대로 넣은 것과 같은 돈을 매주 똑같이 넣은 것을 52주 뒤에 비교했어요",
    excess: (signed: string) => `정액 대비 ${signed}%p`,
    interval: (lo: string, hi: string) => `90% 구간 ${lo} ~ ${hi}%p`,
    years: (positive: number, total: number) => `${total}년 중 ${positive}년 앞섬`,
    window: (from: string, to: string, weeks: number) => `${from} ~ ${to} · ${weeks}주 검산`,
    gatePassed: "관문 통과 — 밴드 배수를 켰어요",
    gateBlocked: {
      not_better_than_flat: "정액보다 낫다고 볼 수 없어 배수를 켜지 않았어요",
      insufficient_sample: "검산 표본이 모자라 배수를 켜지 않았어요",
      stale_inputs: "입력이 오래돼 배수를 켜지 않았어요",
    } as Record<string, string>,
    gateBlockedOther: "관문을 통과하지 못해 배수를 켜지 않았어요",
    rule: (prereg: string) => `기준 ${prereg}`,
  },

  failures: {
    heading: "빗나간 때",
    what: (shown: number, total: number) => `밴드가 틀렸던 때 ${total}건 중 큰 ${shown}건`,
    kind: {
      wrong_cheap: "낮다고 봤는데 52주 뒤 크게 빠짐",
      wrong_expensive: "높다고 봤는데 52주 뒤 크게 오름",
      missed_drop: "크게 빠지는 것을 미리 보지 못함",
    } as Record<string, string>,
    row: (band: string, multiplier: string, ret: string) => `${band} 밴드 · ${multiplier}배 · 52주 뒤 ${ret}%`,
    empty: "빗나간 때가 없어요",
  },

  blocked: {
    title: "밴드 카드를 보이지 않아요",
    rule: "근거 · 과거 성적 · 빗나간 때가 모두 있을 때만 밴드 카드를 보여요. 이것은 정상 동작입니다.",
    amountKept: "금액은 위 계획 그대로예요(밴드 조정 없음).",
    reason: {
      band_missing: "이번 주 밴드 근거가 아직 없어요",
      indicator_missing: "지표 값이 없어요",
      track_record_missing: "과거 성적이 없어요",
      failure_cases_missing: "빗나간 때 기록이 없어요",
      gate_missing: "근거를 확인하지 못했어요",
    } as Record<string, string>,
  },

  kimchi: {
    heading: "원화 매수 비용",
    premium: (signed: string) => `업비트 비트코인이 해외보다 ${signed}%`,
    cost: (amount: string) => `이번 주 비트코인 계획 중 약 ${amount}원이 프리미엄 몫이에요`,
    discount: (amount: string) => `이번 주 비트코인 계획이 해외보다 약 ${amount}원 싸게 사는 셈이에요`,
    level: {
      high: "원화 매수 비용이 평소보다 높아요",
      normal: "원화 매수 비용이 평소 범위예요",
      low: "원화 매수 비용이 평소보다 낮아요",
    } satisfies Record<KimchiLevel, string>,
    context: "국내 개인 매수세가 몰리면 커지는 값이라 분위기를 보는 참고로만 써요",
  },

  streak: {
    line: (weeks: number, cumulative: string) => `${weeks}주 연속 적립 · 누적 ${cumulative}원`,
    skipped: (skipped: number, planned: number) => `최근 ${planned}주 중 ${skipped}주 미실행`,
  },

  status: {
    executed: (amount: string) => `적립함 · ${amount}원`,
    skipped: "미실행으로 마감",
  },

  monthly: {
    heading: "이번 달 적립",
    executed: (amount: string) => `${amount}원`,
    executedAria: (amount: string) => `이번 달 적립 ${amount}원`,
    progress: (planned: string, pct: string, days: number) => `계획 ${planned}원 중 ${pct}% · ${days}일 남음`,
    noPlan: (days: number) => `${days}일 남음`,
    progressLabel: "이번 달 계획 대비 적립",
    loadFailed: "이번 달 적립 합계를 불러오지 못했어요",
  },
} as const;
