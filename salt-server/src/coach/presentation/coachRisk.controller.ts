import Decimal from "decimal.js";
import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { CoachUseCases } from "../application/api";
import {
  createTradePlanSchema,
  listTradePlansQuerySchema,
  sizeCheckSchema,
  tradePlanParamsSchema,
  updateRiskBudgetSchema,
  updateTradePlanSchema,
} from "./dto/coach.dto";
import {
  toRiskBudgetResponse,
  toSizeCheckResponse,
  toTradePlanResponse,
} from "./dto/riskView";

/**
 * F009 슬라이스 1 — 사이즈 계산 · 거래 계획 · 리스크 예산 (`/api/coach/*`, `SRV-REQ-038`).
 *
 * `coachTools.controller` 와 나눈 이유: 저쪽은 이관한 옛 경로 넷이고 응답이 유스케이스 결과 그대로다.
 * 여기는 새 계약이고 **원 반올림 · Decimal → number 변환**(`dto/riskView`)을 거친다.
 * 숫자 입력은 JSON number 로 받아 여기서 `Decimal` 로 올린다 — 유스케이스는 `number` 금액을 받지 않는다.
 */

const dec = (value: number | undefined): Decimal | undefined =>
  value === undefined ? undefined : new Decimal(value);
const decOrNull = (value: number | null | undefined): Decimal | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Decimal(value);
const dateOrNull = (value: string | null | undefined): Date | null | undefined =>
  value === undefined ? undefined : value === null ? null : new Date(value);
const budget = (value: { amount: number; unit: "krw" | "percent" } | null | undefined) =>
  value === undefined ? undefined : value === null ? null : { amount: new Decimal(value.amount), unit: value.unit };

export class CoachRiskController {
  constructor(private readonly useCases: CoachUseCases) {}

  checkTradeSize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = sizeCheckSchema.parse(req.body);
      const result = await this.useCases.checkTradeSize.execute(req.user!.userId, {
        symbol: body.symbol,
        side: body.side,
        quantity: new Decimal(body.quantity),
        price: new Decimal(body.price),
        stopPrice: dec(body.stopPrice),
        winRate: dec(body.winRate),
        payoffRatio: dec(body.payoffRatio),
      });
      return ResponseUtil.success(res, toSizeCheckResponse(result));
    } catch (error) {
      next(error);
    }
  };

  getRiskBudget = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const view = await this.useCases.getRiskBudget.execute(req.user!.userId);
      return ResponseUtil.success(res, toRiskBudgetResponse(view));
    } catch (error) {
      next(error);
    }
  };

  updateRiskBudget = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = updateRiskBudgetSchema.parse(req.body);
      const view = await this.useCases.updateRiskBudget.execute(req.user!.userId, {
        monthlyLossBudget: budget(body.monthlyLossBudget),
        perTradeMaxLoss: budget(body.perTradeMaxLoss),
        targetVolatility: decOrNull(body.targetVolatility),
      });
      return ResponseUtil.success(res, toRiskBudgetResponse(view));
    } catch (error) {
      next(error);
    }
  };

  createTradePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = createTradePlanSchema.parse(req.body);
      const plan = await this.useCases.createTradePlan.execute(req.user!.userId, {
        symbol: body.symbol,
        side: body.side,
        transactionId: body.transactionId,
        stopPrice: dec(body.stopPrice),
        targetPrice: dec(body.targetPrice),
        plannedQuantity: dec(body.plannedQuantity),
        thesis: body.thesis,
        invalidation: body.invalidation,
        reviewAt: body.reviewAt ? new Date(body.reviewAt) : undefined,
        probabilityUp: dec(body.probabilityUp),
      });
      return ResponseUtil.created(res, toTradePlanResponse(plan));
    } catch (error) {
      next(error);
    }
  };

  updateTradePlan = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = tradePlanParamsSchema.parse(req.params);
      const body = updateTradePlanSchema.parse(req.body);
      const plan = await this.useCases.updateTradePlan.execute(req.user!.userId, id, {
        transactionId: body.transactionId,
        stopPrice: decOrNull(body.stopPrice),
        targetPrice: decOrNull(body.targetPrice),
        plannedQuantity: decOrNull(body.plannedQuantity),
        thesis: body.thesis,
        invalidation: body.invalidation,
        reviewAt: dateOrNull(body.reviewAt),
        probabilityUp: decOrNull(body.probabilityUp),
      });
      return ResponseUtil.success(res, toTradePlanResponse(plan));
    } catch (error) {
      next(error);
    }
  };

  listTradePlans = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = listTradePlansQuerySchema.parse(req.query);
      const plans = await this.useCases.listTradePlans.execute(req.user!.userId, query);
      return ResponseUtil.success(res, { plans: plans.map(toTradePlanResponse) });
    } catch (error) {
      next(error);
    }
  };
}
