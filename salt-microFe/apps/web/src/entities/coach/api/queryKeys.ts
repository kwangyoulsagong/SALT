/** 코치 슬라이스가 소유하는 쿼리 키. 슬라이스 밖에서 만들지 않는다. */
export const coachQueryKeys = {
  /**
   * 종목 판단. **모드가 키에 없다** (`FE-REQ-028` FR-81) — 응답에 두 모드가 다 있어서
   * 모드 전환은 같은 캐시를 다르게 읽을 뿐이다.
   */
  symbol: (symbol: string) => ["coach", "symbol", symbol] as const,
  /** 코치 리포트. 재생성이 끝나면 이 키만 무효화한다 */
  report: () => ["coach", "report"] as const,
  generationStatus: () => ["coach", "generation-status"] as const,
  /** 가격 변동 범위. 배치가 하루 1회 만든다 */
  forecast: (symbol: string) => ["coach", "forecast", symbol] as const,
  /** 주요 사건(거시 일정) · 과거 반응. 배치가 하루 1회 만든다 */
  events: (symbol: string) => ["coach", "events", symbol] as const,
  /** 리스크 예산 게이지. 거래 · 예산을 저장하면 무효화한다 */
  riskBudget: () => ["coach", "risk-budget"] as const,
  /** 종목별 거래 계획. 거래 + 계획을 저장하면 그 종목 키를 무효화한다 */
  plans: (symbol: string) => ["coach", "plans", symbol] as const,
  /**
   * 사이즈 계산(서버 미리보기, `features/record-transaction`). 계산은 저장하지 않지만 보유 · 예산이 바뀌면
   * 결과가 달라진다 — 거래 · 예산 저장 뒤 이 접두사 전체를 버린다
   */
  sizeCheckAll: () => ["coach", "size-check"] as const,
} as const;
