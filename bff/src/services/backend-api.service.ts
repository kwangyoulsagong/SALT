import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";

class BackendApiService {
  private client: AxiosInstance;
  private logger = logger;
  constructor() {
    this.client = axios.create({
      baseURL: env.BACKEND_API_URL,
      timeout: 10000,
    });

    // 요청 인터셉터
    this.client.interceptors.request.use(
      (config) => {
        logger.debug(
          `Backend API Request: ${config.method?.toUpperCase()} ${config.url}`
        );
        return config;
      },
      (error) => {
        logger.error("Backend API Request Error:", error);
        return Promise.reject(error);
      }
    );

    // 응답 인터셉터
    this.client.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        logger.error("Backend API Response Error:", error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Auth - 토큰과 함께 요청
   */
  async proxyAuthRequest(
    method: string,
    url: string,
    token: string,
    data?: any,
    /** 경로별 예산(`BFF-REQ-025` 호출 맵) · 클라이언트가 끊으면 같이 끊는다 */
    options: { timeout?: number; signal?: AbortSignal } = {}
  ) {
    return this.client.request({
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data,
      ...options,
    });
  }

  /**
   * Public proxy — 인증 토큰 없이 salt-server 호출.
   *
   * 기본 타임아웃(10s)을 쓴다. 호출처는 뉴스 · 초대 확인/수락뿐이고 LLM 이 없다 —
   * 30s 를 따로 주던 것은 LLM 경로가 여기를 지나던 때의 흔적이다(`performance-bff.md` §3).
   */
  async proxyRequest(method: string, url: string, data?: any) {
    return this.client.request({ method, url, data });
  }

  /**
   * Internal API - 인증 없이 요청
   */
  async getWatchlistSymbols() {
    const response = await this.client.get("/investment/internal/symbols");
    return response.data.data;
  }

  async updateWatchlistPrices(
    priceData: Array<{
      symbol: string;
      currentPrice: number;
      priceChange24h: number;
    }>
  ) {
    const response = await this.client.post(
      "/investment/internal/update-prices",
      {
        priceData,
      }
    );
    return response.data;
  }

  /**
   * 보유 평가에 시세를 반영한다.
   *
   * **이 경로를 부르는 곳이 없었다.** 서버에 엔드포인트만 있고 아무도 호출하지 않아서
   * `portfolio_holdings.current_value` 가 생성 이후 영원히 0 이었다 — 홈 "주식" 섹션이
   * 언제나 0원이 되는 원인이다. 관심 목록과 같은 페이로드를 같은 주기로 보낸다.
   */
  async updateHoldingPrices(
    priceData: Array<{ symbol: string; currentPrice: number }>
  ) {
    const response = await this.client.post(
      "/portfolio/internal/update-prices",
      { priceData }
    );
    return response.data;
  }
  /**
   * Market Overview 조회
   */
  async getMarketOverview(query: Record<string, unknown>) {
    const response = await this.client.get("/investment/market/overview", {
      params: query,
    });
    return response.data.data;
  }
  /** 시장 요약 띠 — 공개 경로. 무엇을 요약할지는 서버 설정이 정한다(`SRV-REQ-036`) */
  async getMarketSummary() {
    const response = await this.client.get("/investment/market/summary");
    return response.data.data;
  }
  async getMarketSymbols() {
    try {
      const response = await this.client.get(
        "/investment/internal/market/symbols"
      );
      return Array.isArray(response.data.data) ? response.data.data : [];
    } catch (e) {
      this.logger.error("Failed to fetch market symbols, fallback empty list");
      return []; // fallback
    }
  }
}

export const backendApi = new BackendApiService();
