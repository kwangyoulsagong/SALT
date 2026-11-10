import { NextFunction, Request, Response } from "express";

import { ResponseUtil } from "../../shared/presentation/ResponseUtil";
import type { KrStockUseCases, MarketUseCases } from "../application/api";
import type { KrSummaryItem } from "../application/GetKrMarketSummary";
import { KrStockDisabledError } from "../domain";
import {
  krChartQuerySchema,
  krCodeParamSchema,
  krInvestorQuerySchema,
  krListQuerySchema,
  krNewsBodyParamSchema,
  krScheduleQuerySchema,
  krSearchQuerySchema,
} from "./dto/krStock.dto";

/**
 * 국내 주식 조회(F011 · `SRV-REQ-040`). 키가 없어 꺼져 있으면 모든 경로가 503 이다(FR-6).
 * 누가 읽는지는 라우터 `marketReaderMiddleware` 가 본다(사람 · 게스트) — 시세 유스케이스는 신원을 받지 않는다(`ADR-011`).
 */
export class KrStockController {
  constructor(
    private readonly useCases: KrStockUseCases | null,
    private readonly getSchedule: MarketUseCases["getKrMarketSchedule"]
  ) {}

  /** 다가오는 국내 시장 일정 — 키가 꺼져 있어도 된다(공개 사실, `SRV-REQ-041` FR-5) */
  schedule = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { days } = krScheduleQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.getSchedule.execute(days));
    } catch (error) {
      next(error);
    }
  };

  private enabled(): KrStockUseCases {
    if (!this.useCases) throw new KrStockDisabledError();
    return this.useCases;
  }

  /**
   * 국내 요약 띠(`SRV-REQ-042`) — 반올림은 여기 한 번: 종목 가격 · 등락 금액 · 거래대금은 원 정수, 지수는 포인트 소수 둘째 자리
   * (KIS 가 주는 자릿수)
   */
  summary = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const view = await this.enabled().getSummary.execute();
      const toDto = (item: KrSummaryItem) => {
        const round = item.kind === "index" ? (v: number) => Math.round(v * 100) / 100 : (v: number) => Math.round(v) || 0;
        const roundOrNull = (v: number | null) => (v === null ? null : round(v));
        return {
          ...item,
          currentPrice: round(item.currentPrice),
          change24hAmount: round(item.change24hAmount),
          high24h: roundOrNull(item.high24h),
          low24h: roundOrNull(item.low24h),
          tradeValue24h: item.tradeValue24h === null ? null : Math.round(item.tradeValue24h),
          priceUpdatedAt: item.priceUpdatedAt.toISOString(),
        };
      };
      return ResponseUtil.success(res, {
        ...view,
        featured: view.featured ? toDto(view.featured) : null,
        items: view.items.map(toDto),
      });
    } catch (error) {
      next(error);
    }
  };

  session = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return ResponseUtil.success(res, await this.enabled().getSession.execute());
    } catch (error) {
      next(error);
    }
  };

  assets = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = krListQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.enabled().listQuotes.execute(query));
    } catch (error) {
      next(error);
    }
  };

  search = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { q } = krSearchQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.enabled().search.execute(q));
    } catch (error) {
      next(error);
    }
  };

  detail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      return ResponseUtil.success(res, await this.enabled().getDetail.execute(code));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 실시간 체결 SSE — `event: tick` `[{ code, price, change, changeRate, volume, at }]` · 15초 하트비트.
   * 연결이 끊기면 구독을 푼다(`ddd-presentation.md` §6)
   */
  stream = (req: Request, res: Response, next: NextFunction) => {
    try {
      const kr = this.enabled();
      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.write(`event: status\ndata: ${JSON.stringify(kr.realtime.status())}\n\n`);
      const unlisten = kr.realtime.listen((events) => {
        res.write(`event: tick\ndata: ${JSON.stringify(events)}\n\n`);
      });
      const heartbeat = setInterval(() => res.write(`: hb\n\n`), 15_000);
      req.on("close", () => {
        clearInterval(heartbeat);
        unlisten();
      });
    } catch (error) {
      next(error);
    }
  };

  chart = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      const { period, count } = krChartQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.enabled().getChart.execute(code, period, count));
    } catch (error) {
      next(error);
    }
  };

  indices = async (req: Request, res: Response, next: NextFunction) => {
    try {
      return ResponseUtil.success(res, await this.enabled().getIndices.execute());
    } catch (error) {
      next(error);
    }
  };

  investors = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      const { days } = krInvestorQuerySchema.parse(req.query);
      return ResponseUtil.success(res, await this.enabled().getInvestorFlows.execute(code, days));
    } catch (error) {
      next(error);
    }
  };

  news = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      return ResponseUtil.success(res, await this.enabled().getNews.execute(code));
    } catch (error) {
      next(error);
    }
  };

  newsBody = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code, serial } = krNewsBodyParamSchema.parse(req.params);
      return ResponseUtil.success(res, await this.enabled().getNewsBody.execute(code, serial));
    } catch (error) {
      next(error);
    }
  };

  whyMoved = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      return ResponseUtil.success(res, await this.enabled().getWhyMoved.execute(code));
    } catch (error) {
      next(error);
    }
  };

  intradayFlows = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      return ResponseUtil.success(res, await this.enabled().getIntradayFlows.execute(code));
    } catch (error) {
      next(error);
    }
  };

  orderbook = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { code } = krCodeParamSchema.parse(req.params);
      return ResponseUtil.success(res, await this.enabled().getOrderbook.execute(code));
    } catch (error) {
      next(error);
    }
  };
}
