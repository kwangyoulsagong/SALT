import { NextFunction, Request, Response } from "express";

import { appPlanService } from "../../services/app-plan.service";
import { isPlanAsset, type CompleteWeeklyPlanInput } from "../../services/plan.viewmodel";
import { AppError } from "../../utils/error.util";

type Raw = Record<string, unknown>;
const invalid = (message: string) => new AppError(message, 400, true, "VALIDATION_ERROR");
const isObject = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

/**
 * 모양만 본다 — 금액 상한 · 이번 주인가 · 설정했나는 서버(`PLAN_EXECUTION_INVALID` · `PLAN_WEEK_NOT_CURRENT` · `PLAN_NOT_CONFIGURED`).
 * 금액은 정수만 — 반올림 · 합산하지 않는다(사용자가 넣은 값 그대로)
 */
const parseComplete = (body: unknown): CompleteWeeklyPlanInput | AppError => {
  if (!isObject(body)) return invalid("본문이 객체가 아닙니다");
  if (typeof body.weekOf !== "string" || !DATE.test(body.weekOf)) return invalid("weekOf 는 YYYY-MM-DD 입니다");
  if (!Array.isArray(body.executions) || body.executions.length === 0) return invalid("executions 가 비었습니다");
  const executions: CompleteWeeklyPlanInput["executions"] = [];
  for (const row of body.executions) {
    if (!isObject(row) || !isPlanAsset(row.asset)) return invalid("asset 은 btc · kospi 입니다");
    if (executions.some((e) => e.asset === row.asset)) return invalid("자산이 겹칩니다");
    if (row.amountKrw !== undefined && !(typeof row.amountKrw === "number" && Number.isInteger(row.amountKrw))) {
      return invalid("amountKrw 는 정수입니다");
    }
    executions.push({ asset: row.asset, ...(typeof row.amountKrw === "number" ? { amountKrw: row.amountKrw } : {}) });
  }
  return { weekOf: body.weekOf, executions };
};

/**
 * 밴드 적립(F003 v2 순서 3 · `BFF-REQ-019`~`021`) — 응답은 `{ success, data }` 봉투(거래 기록과 같은 모양).
 * 계산 · 게이트 판정 0 · 쓰기 재시도 0 · 서버 4xx 는 error middleware 가 코드 그대로
 */
export const planController = {
  async getWeekly(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await appPlanService.getWeekly(req.token!) });
    } catch (error) {
      next(error);
    }
  },
  async complete(req: Request, res: Response, next: NextFunction) {
    const input = parseComplete(req.body);
    if (input instanceof AppError) return next(input);
    try {
      res.json({ success: true, data: await appPlanService.complete(req.token!, input) });
    } catch (error) {
      next(error);
    }
  },
  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      res.json({ success: true, data: await appPlanService.getSettings(req.token!) });
    } catch (error) {
      next(error);
    }
  },
  /** 본문을 거르지 않는다 — `monthlyBaseKrw` 형식 · 밴드 키 거부는 서버 한 곳(FR-60 · 62) */
  async updateSettings(req: Request, res: Response, next: NextFunction) {
    if (!isObject(req.body)) return next(invalid("본문이 객체가 아닙니다"));
    try {
      res.json({ success: true, data: await appPlanService.updateSettings(req.token!, req.body) });
    } catch (error) {
      next(error);
    }
  },
  async getMonthlySummary(req: Request, res: Response, next: NextFunction) {
    const month = req.query.month;
    if (month !== undefined && (typeof month !== "string" || !MONTH.test(month))) return next(invalid("month 는 YYYY-MM 입니다"));
    try {
      res.json({ success: true, data: await appPlanService.getMonthlySummary(req.token!, typeof month === "string" ? month : null) });
    } catch (error) {
      next(error);
    }
  },
};
