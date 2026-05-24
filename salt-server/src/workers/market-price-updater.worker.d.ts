declare class MarketPriceUpdater {
    private investmentService;
    private updateInterval;
    private isUpdating;
    /**
     * Worker 시작
     */
    start(): void;
    /**
     * Worker 중지
     */
    stop(): void;
    /**
     * 가격 업데이트 실행
     */
    private updatePrices;
}
export declare const marketPriceUpdater: MarketPriceUpdater;
export {};
