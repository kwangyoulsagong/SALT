import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { KrStockUseCases } from "../application/api";
import { KrStockDisabledError } from "../domain";
import {
  krChartQuerySchema,
  krCodeParamSchema,
  krListQuerySchema,
  krSearchQuerySchema,
} from "./dto/krStock.dto";

/**
 * 국내 주식 조회(F011 · `SRV-REQ-040`). 키가 없어 꺼져 있으면 모든 경로가 503 이다(FR-6).
 * 볼 수 있는지(소유자) 판정은 유스케이스가 한다 — 컨트롤러는 신원만 넘긴다.
 */
export class KrStockController {
  constructor(private readonly useCases: KrStockUseCases | null) {}

  private enabled(): KrStockUseCases {
    if (!this.useCases) throw new KrStockDisabledError();
    return this.useCases;
  }

  private viewer(req: Request) {
    return { userId: req.user!.userId, email: req.user!.email };
  }

  session = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return ResponseUtil.success(res, await this.enabled().getSession.execute(this.viewer(req)));
    } catch (error) {
      next(error);
    }
  };

  assets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = krListQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.enabled().listQuotes.execute(this.viewer(req), query));
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = krSearchQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.enabled().search.execute(this.viewer(req), q));
    } catch (error) {
      next(error);
    }
  };

  detail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      return ResponseUtil.success(res, await this.enabled().getDetail.execute(this.viewer(req), code));
    } catch (error) {
      next(error);
    }
  };

  chart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      const { period, count } = krChartQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.enabled().getChart.execute(this.viewer(req), code, period, count));
    } catch (error) {
      next(error);
    }
  };
}
