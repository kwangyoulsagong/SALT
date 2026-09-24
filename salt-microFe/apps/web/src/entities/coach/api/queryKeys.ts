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
} as const;
