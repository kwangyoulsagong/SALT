import { NextFunction, Request, Response } from "express";
import { appSearchExtrasService, appSearchService, type SearchRelatedTarget } from "../../services/app-search.service";

/** 서버 DTO(`search.dto.ts`)와 같은 경계 — 서버를 부르기 전에 막는다 */
const MAX_QUERY_LENGTH = 30;
const MAX_LIMIT = 30;
const DEFAULT_LIMIT = 20;
const ASSET_TYPES = ["crypto", "kr_stock"] as const;

const badRequest = (res: Response, message: string) => res.status(400).json({ success: false, message });

/**
 * 종목 검색 (`BFF-REQ-007` H절 FR-70). 요청 파싱 · 서비스 호출 · 응답만. 화면을 떠나면(타이핑으로 다음 요청이 오면)
 * upstream 도 끊는다
 */
class AppSearchController {
  search = async (req: Request, res: Response, next: NextFunction) => {
    const q = req.query.q === undefined ? "" : req.query.q;
    if (typeof q !== "string" || q.length > MAX_QUERY_LENGTH) {
      return badRequest(res, `q 는 ${MAX_QUERY_LENGTH}자 이하 문자열입니다`);
    }
    const rawType = req.query.assetType;
    if (rawType !== undefined && !(ASSET_TYPES as readonly unknown[]).includes(rawType)) {
      return badRequest(res, "assetType 은 crypto · kr_stock 입니다");
    }
    const rawLimit = req.query.limit;
    const limit = rawLimit === undefined ? DEFAULT_LIMIT : typeof rawLimit === "string" && /^\d+$/.test(rawLimit) ? Number(rawLimit) : NaN;
    if (!(limit >= 1 && limit <= MAX_LIMIT)) return badRequest(res, `limit 은 1~${MAX_LIMIT} 정수입니다`);

    const aborter = new AbortController();
    res.on("close", () => {
      if (!res.writableFinished) aborter.abort();
    });
    try {
      const data = await appSearchService.search(
        req.token!,
        { q, limit, ...(rawType ? { assetType: rawType as (typeof ASSET_TYPES)[number] } : {}) },
        aborter.signal,
      );
      return res.json({ success: true, data });
    } catch (error) {
      if (aborter.signal.aborted) return;
      return next(error);
    }
  };
}

export const appSearchController = new AppSearchController();

/** 서버 DTO(`search.dto.ts` `risingSectorsSchema` · `searchRelatedSchema`)와 같은 경계 */
const RISING_DEFAULT_LIMIT = 5;
const RISING_MAX_LIMIT = 20;
const SECTOR_CODE = /^\d{4}$/;
const KR_CODE = /^[0-9A-Z]{6}$/;
const COIN_SYMBOL = /^[0-9A-Za-z]{1,15}$/;

/** 클라이언트가 떠나면(다음 글자 · 다음 행) upstream 도 끊는다 */
const abortOnClose = (res: Response) => {
  const aborter = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) aborter.abort();
  });
  return aborter;
};

const relatedTarget = (query: Request["query"]): SearchRelatedTarget | null => {
  const { assetType, symbol, sector } = query;
  if (sector !== undefined) {
    return assetType === undefined && symbol === undefined && typeof sector === "string" && SECTOR_CODE.test(sector)
      ? { sector }
      : null;
  }
  if (typeof symbol !== "string") return null;
  if (assetType === "kr_stock" && KR_CODE.test(symbol)) return { assetType, symbol };
  if (assetType === "crypto" && COIN_SYMBOL.test(symbol)) return { assetType, symbol: symbol.toUpperCase() };
  return null;
};

/**
 * 검색 모달 2단계(`BFF-REQ-054`) — 결과 묶음(업종 · 지수 · 뉴스) · 뜨는 업종 · 곁 칸. 요청 파싱 · 서비스 호출 · 응답만
 */
class AppSearchExtrasController {
  groups = async (req: Request, res: Response, next: NextFunction) => {
    const q = req.query.q === undefined ? "" : req.query.q;
    if (typeof q !== "string" || q.length > MAX_QUERY_LENGTH) {
      return badRequest(res, `q 는 ${MAX_QUERY_LENGTH}자 이하 문자열입니다`);
    }
    const aborter = abortOnClose(res);
    try {
      return res.json({ success: true, data: await appSearchExtrasService.groups(req.token!, q, aborter.signal) });
    } catch (error) {
      if (aborter.signal.aborted) return;
      return next(error);
    }
  };

  risingSectors = async (req: Request, res: Response, next: NextFunction) => {
    const raw = req.query.limit;
    const limit = raw === undefined ? RISING_DEFAULT_LIMIT : typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
    if (!(limit >= 1 && limit <= RISING_MAX_LIMIT)) return badRequest(res, `limit 은 1~${RISING_MAX_LIMIT} 정수입니다`);
    const aborter = abortOnClose(res);
    try {
      return res.json({ success: true, data: await appSearchExtrasService.risingSectors(req.token!, limit, aborter.signal) });
    } catch (error) {
      if (aborter.signal.aborted) return;
      return next(error);
    }
  };

  related = async (req: Request, res: Response, next: NextFunction) => {
    const target = relatedTarget(req.query);
    if (!target) return badRequest(res, "assetType+symbol(crypto · kr_stock) 또는 sector(네 자리) 하나입니다");
    const aborter = abortOnClose(res);
    try {
      return res.json({ success: true, data: await appSearchExtrasService.related(req.token!, target, aborter.signal) });
    } catch (error) {
      if (aborter.signal.aborted) return;
      return next(error);
    }
  };
}

export const appSearchExtrasController = new AppSearchExtrasController();
