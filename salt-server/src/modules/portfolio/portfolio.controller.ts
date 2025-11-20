import { Request, Response, NextFunction } from 'express';
import { PortfolioService } from './portfolio.service';
import { ResponseUtil } from '../../utils/response.util';
import {
  createTransactionSchema,
  updateTransactionSchema,
  queryTransactionsSchema,
  queryHoldingsSchema,
} from './portfolio.dto';

export class PortfolioController {
  private portfolioService = new PortfolioService();

  createTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const data = createTransactionSchema.parse(req.body);
      const result = await this.portfolioService.createTransaction(userId, data);

      return ResponseUtil.created(res, result, 'Transaction created successfully');
    } catch (error) {
      next(error);
    }
  };

  getTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryTransactionsSchema.parse(req.query);
      const result = await this.portfolioService.getTransactions(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getHoldings = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const query = queryHoldingsSchema.parse(req.query);
      const result = await this.portfolioService.getHoldings(userId, query);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  updateTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const data = updateTransactionSchema.parse(req.body);
      const result = await this.portfolioService.updateTransaction(userId, id, data);

      return ResponseUtil.success(res, result, 'Transaction updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const { id } = req.params;
      const result = await this.portfolioService.deleteTransaction(userId, id);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  getPortfolioStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const result = await this.portfolioService.getPortfolioStats(userId);

      return ResponseUtil.success(res, result);
    } catch (error) {
      next(error);
    }
  };

  // 내부 API (BFF용)
  updateHoldingPrices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { priceData } = req.body;
      await this.portfolioService.updateHoldingPrices(priceData);

      return ResponseUtil.success(res, { message: 'Prices updated successfully' });
    } catch (error) {
      next(error);
    }
  };
}
