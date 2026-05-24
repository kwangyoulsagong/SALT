import { AddToWatchlistDto, QueryWatchlistDto } from "./investment.dto";
type MarketOverviewSort = "trade_value" | "change" | "price" | "name";
type MarketOverviewPeriod = "1d" | "7d" | "1m" | "3m" | "6m" | "1y";
interface MarketOverviewQuery {
    page?: number;
    limit?: number;
    sort?: MarketOverviewSort;
    order?: "asc" | "desc";
    period?: MarketOverviewPeriod;
    search?: string;
}
export declare class InvestmentService {
    private upbitService;
    /**
     * 관심 목록에 추가
     */
    addToWatchlist(userId: string, data: AddToWatchlistDto): Promise<{
        symbol: string;
        assetType: import(".prisma/client").$Enums.AssetType;
        name: string;
        id: string;
        userId: string;
        currentPrice: import("@prisma/client/runtime/library").Decimal | null;
        priceChange24h: import("@prisma/client/runtime/library").Decimal | null;
        lastUpdated: Date | null;
        addedAt: Date;
    }>;
    /**
     * 관심 목록 조회
     */
    getWatchlist(userId: string, query: QueryWatchlistDto): Promise<{
        items: {
            logoUrl: string;
            symbol: string;
            assetType: import(".prisma/client").$Enums.AssetType;
            name: string;
            id: string;
            userId: string;
            currentPrice: import("@prisma/client/runtime/library").Decimal | null;
            priceChange24h: import("@prisma/client/runtime/library").Decimal | null;
            lastUpdated: Date | null;
            addedAt: Date;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * 관심 목록에서 제거
     */
    removeFromWatchlist(userId: string, watchlistId: string): Promise<{
        message: string;
    }>;
    /**
     * 실시간 가격 조회 (Upbit)
     */
    getRealTimePrice(symbol: string): Promise<{
        logoUrl: string;
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
     * 차트 데이터 조회
     */
    getChartData(symbol: string, period?: "day" | "minute", count?: number, unit?: 1 | 3 | 5 | 15 | 30 | 60 | 240): Promise<any>;
    /**
     * 모든 관심목록 심볼 조회 (BFF용 Internal API)
     */
    getAllWatchlistSymbols(): Promise<string[]>;
    /**
     * 관심목록 가격 일괄 업데이트 (BFF용 Internal API)
     */
    updateWatchlistPrices(priceData: Array<{
        symbol: string;
        currentPrice: number;
        priceChange24h: number;
    }>): Promise<{
        updated: number;
    }>;
    /**
     * 🔥 IMPROVED: DB 우선 조회 + 비동기 가격 업데이트
     * 1. DB에서 캐시된 가격 즉시 반환 (빠른 초기 로딩)
     * 2. 백그라운드에서 Upbit API로 최신 가격 업데이트
     */
    getMarketOverview(query: MarketOverviewQuery): Promise<{
        items: {
            symbol: string;
            market: string;
            koreanName: string;
            englishName: string;
            currentPrice: number;
            change24h: number;
            high24h: number;
            low24h: number;
            volume24h: number;
            tradeValue24h: number;
            logoUrl: string;
            priceUpdatedAt: Date | null;
        }[];
        pagination: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
        };
    }>;
    /**
     * 🔥 백그라운드에서 마켓 가격 업데이트
     * 응답을 기다리지 않고 비동기로 실행
     */
    private updateMarketPricesInBackground;
    /**
     * 🔥 Worker가 주기적으로 호출할 전체 가격 업데이트
     * (예: 1분마다 실행)
     */
    updateAllMarketPrices(): Promise<{
        updated: number;
    }>;
    /**
     * 🔥 NEW: 마켓 오버뷰 정렬 헬퍼 메서드
     */
    private sortMarketOverview;
    /**
     * 🔥 NEW: 마켓 오버뷰 캐싱 (선택적 구현)
     * 동일한 쿼리가 1분 이내에 오면 캐시된 데이터 반환
     */
    private marketCache;
    private CACHE_TTL;
    getCachedMarketOverview(query: MarketOverviewQuery): Promise<any>;
    private cleanupMarketCache;
    getAllMarketSymbols(): Promise<string[]>;
}
export {};
