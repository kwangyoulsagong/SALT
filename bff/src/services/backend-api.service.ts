import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";
import { logger } from "../config/logger";

class BackendApiService {
  private client: AxiosInstance;

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
   * Market Overview 조회
   */
  async getMarketOverview(query: any) {
    const response = await this.client.get("/investment/market/overview", {
      params: query,
    });
    return response.data.data;
  }
}

export const backendApi = new BackendApiService();
