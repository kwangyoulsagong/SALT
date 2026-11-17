import { EVENT_KIND_LABELS, EVENT_KIND_SHORT_LABELS } from "@repo/core/coach";

/**
 * 주요 사건 카드 문구 (F008 `FE-REQ-038` FR-13 · FEATURE-008 FR-31).
 *
 * "호재 · 악재"를 판정하지 않는다 — 예상 대비 서프라이즈 데이터가 없다. 방향 단정 · 확신 · 매매 지시 금지
 * (공통 수용 기준 4). 사실(과거 분포 · 평소 대비 움직임 크기)만 말한다.
 */
export const EVENT_MESSAGES = {
  heading: "주요 사건",
  badge: "호재 · 악재 판정 아님",
  lead: "앞으로 5주 안의 미국 거시 일정이에요. 과거 같은 일정 뒤 움직인 폭을 평소와 비교해요.",
  /** 국내 종목 — 국내 시장 일정 + 미국 거시(국내 거래일로 잰다, `FE-REQ-046`) */
  leadKr: "앞으로 5주 안의 국내 · 미국 주요 일정이에요. 과거 같은 일정 뒤 이 종목이 움직인 폭을 평소 거래일과 비교해요.",
  kind: EVENT_KIND_LABELS,
  /** 지역 표시와 같이 쓸 때 */
  kindShort: EVENT_KIND_SHORT_LABELS,
  region: { kr: "국내", us: "미국" } as const,
  scope: { symbol: "이 종목 일정", market: "시장 일정" } as const,
  dday: (days: number) => (days <= 0 ? "오늘" : `D-${days}`),
  horizon: (days: number) => (days === 1 ? "하루" : `${days}일`),
  horizonPicker: "반응 기간 고르기",
  rowEvent: "이 일정 뒤",
  rowBaseline: "평소",
  moveRatio: (ratio: string) => `평소보다 움직임 ${ratio}배`,
  upRate: (rate: string, sample: number) => `오른 적 ${rate} · 표본 ${sample}회`,
  preReturn: (value: string) => `발표 전 5일 중앙값 ${value}`,
  range: (low: string, high: string) => `90% 범위 ${low} ~ ${high}`,
  missesHeading: "빗나간 때",
  miss: (date: string, realized: string, low: string, high: string) =>
    `${date} — 실제 ${realized} (그때 범위 ${low} ~ ${high})`,
  tableCaption: (kind: string, horizon: string) => `${kind} 뒤 ${horizon} 수익률 분포와 평소 분포`,
  colRow: "구분",
  colLow: "하위 5%",
  colMedian: "중앙값",
  colHigh: "상위 5%",
  blockedReason: {
    insufficient_sample: "표본이 쌓이는 중",
    failure_cases_missing: "빗나간 사례 정보가 없어 꺼 둠",
    contract_incomplete: "통계 정보가 모자라 꺼 둠",
    not_generated: "아직 계산 전",
  } as Record<string, string>,
  blockedFallback: "지금은 보여 드릴 수 없어요",
  /**
   * 다음 실적 공시(F008 슬라이스 24 2단계 · `FE-REQ-046` FR-3) — 회사가 알린 날이 없으면 **기간**만. 한 날짜로 말하지 않는다
   * (공통 수용 기준 4). 숫자 · 기간 · 기준은 서버 값
   */
  earnings: {
    name: "실적 공시",
    expected: (from: string, to: string) => `${from} ~ ${to} · 확정 아님`,
    /** D-day 칸(좁다) — 회사가 알린 날이 아닐 때 */
    ddayExpected: "예상",
    confirmed: (source: string) => `회사가 알린 일정 — ${source}`,
    confirmedSource: { ir: "실적 설명회 공시", preview: "결산실적 공시 예고" } as const,
    basis: (sample: number) => `과거 공시일 ${sample}회 기준이에요.`,
    hitRate: (hits: number, judged: number) => `그때그때 그 전 공시로만 잡은 기간에 실제 공시가 든 적 ${judged}번 중 ${hits}번`,
    deadline: (date: string) => `비교 기준 — 법정 제출 기한 ${date}`,
    missesHeading: "기간을 벗어난 결산",
    noMisses: (judged: number) => `지난 ${judged}번은 모두 기간 안이었어요.`,
    /** 결산 끝날(YYYY-MM-DD) → "2024년 4분기" — 12월 결산 기준 분기 이름(달로 센다) */
    periodName: (periodEnd: string) => `${periodEnd.slice(0, 4)}년 ${Math.ceil(Number(periodEnd.slice(5, 7)) / 3)}분기`,
    miss: (period: string, actual: string, from: string, to: string) =>
      `${period} — 실제 ${actual} (그때 기간 ${from} ~ ${to})`,
    reactionKind: "실적 공시",
    reactionRow: "공시 뒤",
    reactionNote: "공시일 전날 종가에서 잰 움직임이에요.",
    blocked: {
      insufficient_sample: "과거 공시가 모자라 기간을 잡지 않았어요",
      not_judged: "기간을 채점할 과거 결산이 모자라요",
      window_passed: "예상 기간이 지났는데 아직 공시가 없어요",
      window_past: "예상 기간이 지났는데 아직 공시가 없어요",
      contract_incomplete: "정보가 모자라 기간을 꺼 뒀어요",
    } as Record<string, string>,
  },
  empty: "앞으로 5주 안에 예정된 일정이 없어요.",
  unavailable: "주요 사건을 지금 불러올 수 없어요.",
} as const;
