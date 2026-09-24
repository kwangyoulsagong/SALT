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
  kind: { fomc: "FOMC 금리 결정", cpi: "미국 소비자물가(CPI)", jobs: "미국 고용보고서" } as const,
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
  empty: "앞으로 5주 안에 예정된 일정이 없어요.",
  unavailable: "주요 사건을 지금 불러올 수 없어요.",
} as const;
