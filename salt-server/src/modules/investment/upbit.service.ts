import axios from 'axios';
import { logger } from '../../config/logger';

const UPBIT_API_URL = 'https://api.upbit.com/v1';

export class UpbitService {
  /**
   * 현재가 정보 조회
   */
  async getCurrentPrice(symbol: string) {
    try {
      const market = `KRW-${symbol.toUpperCase()}`;
      const response = await axios.get(`${UPBIT_API_URL}/ticker`, {
        params: { markets: market },
      });

      if (!response.data || response.data.length === 0) {
        throw new Error('Symbol not found');
      }

      const ticker = response.data[0];
      return {
        symbol,
        market: ticker.market,
        currentPrice: ticker.trade_price,
        change24h: ticker.signed_change_rate * 100,
        high24h: ticker.high_price,
        low24h: ticker.low_price,
        volume24h: ticker.acc_trade_volume_24h,
        timestamp: new Date(ticker.timestamp),
      };
    } catch (error: any) {
      logger.error('Upbit API error:', error.message);
      throw new Error('Failed to fetch price from Upbit');
    }
  }

  /**
   * 일봉 차트 데이터 조회
   */
  async getDailyCandles(symbol: string, count: number = 30) {
    try {
      const market = `KRW-${symbol.toUpperCase()}`;
      const response = await axios.get(`${UPBIT_API_URL}/candles/days`, {
        params: { market, count },
      });

      return response.data.map((candle: any) => ({
        date: candle.candle_date_time_kst,
        open: candle.opening_price,
        high: candle.high_price,
        low: candle.low_price,
        close: candle.trade_price,
        volume: candle.candle_acc_trade_volume,
      }));
    } catch (error: any) {
      logger.error('Upbit candles API error:', error.message);
      throw new Error('Failed to fetch chart data from Upbit');
    }
  }

  /**
   * 분봉 차트 데이터 조회
   */
  async getMinuteCandles(
    symbol: string, 
    unit: 1 | 3 | 5 | 15 | 30 | 60 | 240, 
    count: number = 200
  ) {
    try {
      const market = `KRW-${symbol.toUpperCase()}`;
      const response = await axios.get(
        `${UPBIT_API_URL}/candles/minutes/${unit}`,
        { params: { market, count } }
      );

      return response.data.map((candle: any) => ({
        timestamp: candle.candle_date_time_kst,
        open: candle.opening_price,
        high: candle.high_price,
        low: candle.low_price,
        close: candle.trade_price,
        volume: candle.candle_acc_trade_volume,
      }));
    } catch (error: any) {
      logger.error('Upbit minute candles API error:', error.message);
      throw new Error('Failed to fetch minute chart data from Upbit');
    }
  }

  /**
   * 마켓 코드 조회
   */
  async getAllMarkets() {
    try {
      const response = await axios.get(`${UPBIT_API_URL}/market/all`);
      return response.data.filter((m: any) => m.market.startsWith('KRW-'));
    } catch (error: any) {
      logger.error('Upbit markets API error:', error.message);
      throw new Error('Failed to fetch markets from Upbit');
    }
  }
}
