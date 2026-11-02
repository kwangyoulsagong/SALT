/**
 * 쏠림 신호 카드 문구 (F008 `FE-REQ-038` FR-14 · FEATURE-008 FR-32 · 53).
 *
 * "과열" · "매수 신호" 같은 판정을 하지 않는다. 상태 코드는 1년 백분위 구간이고, 해석은 "통상 해석" 라벨을 달아
 * 우리 판단이 아님을 밝힌다(FR-31 과 같은 선). 방향 단정 · 확신 · 매매 지시 금지(공통 수용 기준 4).
 */
export const POSITIONING_MESSAGES = {
  heading: "쏠림 신호",
  badge: "매매 신호 아님",
  lead: "선물 시장과 국내 가격이 지금 어느 쪽으로 쏠려 있는지예요. 지난 1년과 비교해요.",
  fundingTitle: "선물 펀딩비",
  fundingRate: (rate: string) => `${rate} / 8시간`,
  /** `rank` 는 "상위 5%" · "하위 12%" — 1년 백분위를 가까운 쪽 끝에서 센다 */
  fundingState: {
    long_crowded: (rank: string) => `롱 쏠림 · 1년 중 ${rank}`,
    short_crowded: (rank: string) => `숏 쏠림 · 1년 중 ${rank}`,
    neutral: (rank: string) => `보통 · 1년 중 ${rank}`,
  },
  rankTop: (value: string) => `상위 ${value}`,
  rankBottom: (value: string) => `하위 ${value}`,
  fundingReading: {
    long_crowded:
      "통상 해석 · 선물에서 오르는 쪽에 건 돈이 평소보다 많다는 뜻으로 읽혀요.",
    short_crowded:
      "통상 해석 · 선물에서 내리는 쪽에 건 돈이 평소보다 많다는 뜻으로 읽혀요.",
  } as Record<string, string>,
  openInterest: (usd: string, change: string | null) =>
    change === null ? `미결제약정 ${usd}` : `미결제약정 ${usd} · 7일 ${change}`,
  kimchiTitle: "김치 프리미엄",
  kimchiState: {
    premium: (since: string | null) =>
      since ? `김프 · ${since}부터` : "김프 · 기록 시작부터",
    discount: (since: string | null) =>
      since ? `역프 · ${since}부터` : "역프 · 기록 시작부터",
  },
  kimchiPending: "지금 부호가 바뀌었지만 3일 연속이어야 바뀐 것으로 봐요.",
  kimchiFx: (rate: string, date: string) =>
    `원/달러 ${rate} (유럽중앙은행 ${date} 기준)`,
  reactionsHeading: "이 신호 뒤 과거 반응",
  reactionsEmpty:
    "지금 이어진 신호가 없어요. 쏠림이 생기거나 김프 부호가 바뀌면 과거 반응을 보여 드려요.",
  kind: {
    funding_long_crowded: "펀딩비 롱 쏠림 진입",
    funding_short_crowded: "펀딩비 숏 쏠림 진입",
    kimchi_cross_up: "역프 → 김프 전환",
    kimchi_cross_down: "김프 → 역프 전환",
  } as const,
  rowSignal: "이 신호 뒤",
  preReturn: (value: string) => `신호 전 5일 중앙값 ${value}`,
  blocked: {
    stale_inputs: "쏠림 신호가 사흘 넘게 갱신되지 않았어요.",
    not_generated: "이 종목은 아직 쏠림 신호를 계산하지 않았어요.",
  } as Record<string, string>,
  unavailable: "쏠림 신호를 지금 불러올 수 없어요.",
} as const;
