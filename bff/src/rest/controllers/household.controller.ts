import { NextFunction, Request, Response } from "express";
import { appHouseholdService } from "../../services/app-household.service";

/**
 * 가계부 화면 (`BFF-REQ-048`). 요청 파싱 · 서비스 1회 호출 · 응답 변환만.
 * 본문 형식 검증은 서버가 한다(같은 검사를 두 곳에 두면 갈라진다) — 4xx 는 error middleware 가 status · `code` 를 그대로 옮긴다.
 * **parse 본문(결제 문자 원문)은 읽지도 남기지도 않는다** — 그대로 서버로(FR-2).
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

export const appHouseholdController = {
  record: wrap(201, (req) => appHouseholdService.record(req.token!, req.body ?? {})),
  recordBatch: wrap(201, (req) => appHouseholdService.recordBatch(req.token!, req.body ?? {})),
  deleteExpense: wrap(200, (req) => appHouseholdService.deleteExpense(req.token!, String(req.params.id))),
  goalClock: wrap(200, (req) => appHouseholdService.goalClock(req.token!, String(req.query.amount ?? ""))),
  parse: wrap(200, (req) => appHouseholdService.parse(req.token!, req.body ?? {})),
  suggestions: wrap(200, (req) => appHouseholdService.suggestions(req.token!)),
  budget: wrap(200, (req) => appHouseholdService.budget(req.token!)),
  setBudget: wrap(200, (req) => appHouseholdService.setBudget(req.token!, req.body ?? {})),
  month: wrap(200, (req) => appHouseholdService.month(req.token!, String(req.params.ym))),
  templates: wrap(200, (req) => appHouseholdService.templates(req.token!)),
  createTemplate: wrap(201, (req) => appHouseholdService.createTemplate(req.token!, req.body ?? {})),
  editTemplate: wrap(200, (req) => appHouseholdService.editTemplate(req.token!, String(req.params.id), req.body ?? {})),
  endTemplate: wrap(200, (req) => appHouseholdService.endTemplate(req.token!, String(req.params.id))),
  confirmOccurrence: wrap(201, (req) => appHouseholdService.confirmOccurrence(req.token!, String(req.params.id), req.body ?? {})),
  skipOccurrence: wrap(200, (req) => appHouseholdService.skipOccurrence(req.token!, String(req.params.id))),
  closeMonth: wrap(200, (req) => appHouseholdService.closeMonth(req.token!, String(req.params.ym), req.body ?? {})),
};
