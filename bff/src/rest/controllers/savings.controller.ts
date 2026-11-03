import { NextFunction, Request, Response } from "express";
import { appSavingsService } from "../../services/app-savings.service";

/**
 * 저축 화면 (`BFF-REQ-047`). 요청 파싱 · 서비스 1회 호출 · 응답 변환만.
 * 본문 형식 검증은 서버가 한다(같은 검사를 두 곳에 두면 갈라진다) — 4xx 는 error middleware 가 status · `code` 를 그대로 옮긴다.
 */
type Handler = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

const wrap =
  (status: number, run: (req: Request) => Promise<unknown>): Handler =>
  async (req, res, next) => {
    try {
      return res.status(status).json(await run(req));
    } catch (error) {
      return next(error);
    }
  };

const id = (req: Request): string => String(req.params.id);

export const appSavingsController = {
  templates: wrap(200, (req) => appSavingsService.templates(req.token!)),
  goals: wrap(200, (req) => appSavingsService.goals(req.token!)),
  goal: wrap(200, (req) => appSavingsService.goal(req.token!, id(req))),
  calculate: wrap(200, (req) => appSavingsService.calculate(req.token!, req.body ?? {})),
  create: wrap(201, (req) => appSavingsService.create(req.token!, req.body ?? {})),
  deposit: wrap(201, (req) => appSavingsService.deposit(req.token!, id(req), req.body ?? {})),
  split: wrap(201, (req) => appSavingsService.split(req.token!, req.body ?? {})),
  simulate: wrap(200, (req) => appSavingsService.simulate(req.token!, req.body ?? {})),
  updatePlans: wrap(200, (req) => appSavingsService.updatePlans(req.token!, req.body ?? {})),
  emergency: wrap(200, (req) => appSavingsService.emergency(req.token!, id(req), req.body ?? {})),
  addUnit: wrap(201, (req) => appSavingsService.addUnit(req.token!, id(req), req.body ?? {})),
  deleteUnit: wrap(200, (req) => appSavingsService.deleteUnit(req.token!, id(req), String(req.params.unitId))),
};
