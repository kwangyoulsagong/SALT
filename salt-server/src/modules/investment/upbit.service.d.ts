export type PriceTimeframe = "5m" | "15m" | "1h" | "1d";
export declare class UpbitService {
    /**
     * 현재가 정보 조회
     */
    getCurrentPrice(symbol: string): Promise<{
        symbol: string;
        market: any;
        currentPrice: any;
        change24h: number;
        high24h: any;
        low24h: any;
        volume24h: any;
        timestamp: Date;
    }>;
    /**
     * 일봉 차트 데이터 조회
     */
    getDailyCandles(symbol: string, count?: number): Promise<any>;
    /**
     * 분봉 차트 데이터 조회
     */
    getMinuteCandles(symbol: string, unit: 1 | 3 | 5 | 15 | 30 | 60 | 240, count?: number): Promise<any>;
    /**
     * 마켓 코드 조회
     */
    getAllMarkets(): Promise<any>;
    /**
     * 원화 마켓 전체 조회
     */
    getAllKRWMarkets(): Promise<any>;
    /**
     * 여러 코인의 현재가 한번에 조회
     */
    getCurrentPrices(symbols: string[]): Promise<any>;
    /**
     * 🔥 NEW: 기간별 일수 계산 헬퍼 메서드
     */
    private getPeriodDays;
    /**
     * 🔥 NEW: 여러 심볼의 캔들 데이터 배치 조회 (성능 최적화)
     * 기존: 100개 심볼 = 100번 API 호출 (순차)
     * 개선: 10개씩 묶어서 병렬 처리 = 10번 호출
     */
    getBatchCandles(symbols: string[], period: string): Promise<Record<string, any[]>>;
    /**
     * 🔥 NEW: 캔들 데이터 캐싱 (메모리 캐시)
     * 동일한 요청이 1분 이내에 오면 캐시된 데이터 반환
     */
    private candleCache;
    private CACHE_TTL;
    getCachedDailyCandles(symbol: string, count?: number): Promise<any>;
    private cleanupCache;
    getCandlesByTimeframe(symbol: string, timeframe: PriceTimeframe, count: number): Promise<any>;
}
