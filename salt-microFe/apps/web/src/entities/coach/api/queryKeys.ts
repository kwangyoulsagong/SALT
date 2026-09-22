/** 코치 슬라이스가 소유하는 쿼리 키. 슬라이스 밖에서 만들지 않는다. */
export const coachQueryKeys = {
  /**
   * 종목 판단. **모드가 키에 없다** (`FE-REQ-028` FR-81) — 응답에 두 모드가 다 있어서
   * 모드 전환은 같은 캐시를 다르게 읽을 뿐이다.
   */
  symbol: (symbol: string) => ["coach", "symbol", symbol] as const,
} as const;
