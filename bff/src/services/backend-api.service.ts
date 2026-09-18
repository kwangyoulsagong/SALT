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
    data?: any
  ) {
    return this.client.request({
      method,
      url,
      headers: {
        Authorization: `Bearer ${token}`,
      },
      data,
    });
  }

  /**
   * Public proxy — 인증 토큰 없이 salt-server 호출
   */
  async proxyRequest(method: string, url: string, data?: any) {
    return this.client.request({
      method,
      url,
      data,
      // LLM 호출은 응답 지연이 길 수 있어 별도 타임아웃
      timeout: 30000,
    });
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
  async getMarketOverview(query: any) {
    const response = await this.client.get("/investment/market/overview", {
      params: query,
    });
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
