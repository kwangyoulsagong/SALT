import { Request, Response, NextFunction } from 'express';
import { MarketIntelligenceService } from './market-intelligence.service';
import { ResponseUtil } from '../../utils/response.util';

export class MarketIntelligenceController {
  private service = new MarketIntelligenceService();

  /**
   * 시장 심리 온도계
   */
  getSentiment = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { symbol } = req.params;
      const result = await this.service.calculateSentiment(symbol.toUpperCase());
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 똑똑한 돈 추적
   */
  getSmartMoney = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { symbol } = req.params;
      const result = await this.service.trackSmartMoney(symbol.toUpperCase());
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 심리 히스토리
   */
  getSentimentHistory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { symbol } = req.params;
      const days = req.query.days ? Number(req.query.days) : 30;
      const result = await this.service.getSentimentHistory(
        symbol.toUpperCase(),
        days
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 최근 고래 거래
   */
  getWhaleTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { symbol } = req.params;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const result = await this.service.getRecentWhaleTransactions(
        symbol.toUpperCase(),
        limit
      );
      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  /**
   * 통합 대시보드 (심리 + 스마트머니)
   */
  getDashboard = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { symbol } = req.params;
      const upperSymbol = symbol.toUpperCase();

      const [sentiment, smartMoney] = await Promise.all([
        this.service.calculateSentiment(upperSymbol),
        this.service.trackSmartMoney(upperSymbol),
      ]);

      return ResponseUtil.success(res, {
        symbol: upperSymbol,
        sentiment,
        smartMoney,
        timestamp: new Date(),
      });
    } catch (error) {
      next(error);
    }
  };
}
