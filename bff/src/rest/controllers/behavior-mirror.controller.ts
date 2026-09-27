import { Request, Response, NextFunction } from "express";
import { appBehaviorMirrorService } from "../../services/app-behavior-mirror.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LIMIT_PATTERN = /^\d+$/;
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
/** 서버 zod(`confirmOutcomeTagsSchema`)와 같은 상한. 모양만 먼저 막는다 — 진짜 검증은 서버다 */
const MAX_TAGS = 8;
const MAX_TAG_LENGTH = 20;

const badRequest = (res: Response, message: string) => res.status(400).json({ success: false, message });

/** 화면을 떠나면 upstream 도 끊는다(`trade-risk.controller` 와 같은 규칙) */
const abortOnClose = (res: Response) => {
  const aborter = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) aborter.abort();
  });
  return aborter;
};

/** 없으면 `undefined`(서버 기본값), 1~100 정수가 아니면 `null`(400) */
const parseLimit = (value: unknown): number | undefined | null => {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !LIMIT_PATTERN.test(value)) return null;
  const limit = Number(value);
  return limit >= 1 && limit <= 100 ? limit : null;
};

const parseTags = (body: unknown): string[] | string => {
  const tags = typeof body === "object" && body !== null ? (body as Record<string, unknown>).tags : undefined;
  if (!Array.isArray(tags)) return "tags 는 배열입니다";
  if (tags.length > MAX_TAGS) return `태그는 ${MAX_TAGS}개까지입니다`;
  const trimmed: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== "string") return "태그는 문자열입니다";
    const value = tag.trim();
    if (value.length < 1 || value.length > MAX_TAG_LENGTH) return `태그는 1~${MAX_TAG_LENGTH}자입니다`;
    trimmed.push(value);
  }
  return trimmed;
};

/**
 * F009 슬라이스 5 — 내 거래 미러 · 결정 결과 · 태그 확정 (`BFF-REQ-038` FR-7~9). `/api/app/coach/*` 아래.
 * 숫자와 판정은 전부 서버 몫이다 — 여기는 입력 모양만 본다.
 */
export class AppBehaviorMirrorController {
  mirror = async (req: Request, res: Response, next: NextFunction) => {
    const aborter = abortOnClose(res);
    try {
      const data = await appBehaviorMirrorService.getMirror(req.token!, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  listOutcomes = async (req: Request, res: Response, next: NextFunction) => {
    const limit = parseLimit(req.query.limit);
    if (limit === null) return badRequest(res, "limit 은 1~100 정수입니다");
    const aborter = abortOnClose(res);
    try {
      const data = await appBehaviorMirrorService.listOutcomes(req.token!, limit, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  /** 월간 복기 — `month` 가 없으면 서버가 KST 지난달을 고른다 */
  monthlyReview = async (req: Request, res: Response, next: NextFunction) => {
    const month = req.query.month;
    if (month !== undefined && (typeof month !== "string" || !MONTH_PATTERN.test(month))) {
      return badRequest(res, "month 는 YYYY-MM 입니다");
    }
    const aborter = abortOnClose(res);
    try {
      const data = await appBehaviorMirrorService.getMonthlyReview(req.token!, month, aborter.signal);
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      next(error);
    }
  };

  confirmOutcomeTags = async (req: Request, res: Response, next: NextFunction) => {
    const id = typeof req.params.id === "string" ? req.params.id : "";
    if (!UUID_PATTERN.test(id)) return badRequest(res, "id 형식이 아닙니다");
    const tags = parseTags(req.body);
    if (typeof tags === "string") return badRequest(res, tags);
    try {
      const data = await appBehaviorMirrorService.confirmOutcomeTags(req.token!, id, tags);
      return res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  };
}

export const appBehaviorMirrorController = new AppBehaviorMirrorController();
