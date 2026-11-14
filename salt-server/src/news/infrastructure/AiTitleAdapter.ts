import type { MarketApi } from "../../market/application/api";
import prisma from "../../shared/infrastructure/prisma";
import { type AiTitle, type AiTitleSource, titleOutletSuffix } from "../domain";

/** 한 회차 제목 상한 — 국내 하루 약 1,200 · 코인 약 300(2026-11-14 7일 실측 평균) */
const KR_LIMIT = 3_000;
const COIN_LIMIT = 2_000;

/**
 * AI 경로 본문을 찾을 제목(`SRV-REQ-058` FR-3) — 국내 시황 제목은 `market` 공개 API(ACL), 코인은 우리 원장.
 * `market` 이 `news` 뒤에 조립되므로 부를 때 찾는다(워커 회차 — 조립이 끝난 뒤).
 *
 * 매체 이름: 국내 = 제공처 이름 · 구글 뉴스 제목 = 꼬리(" - 매체") · 그 밖 코인 원장 = `source`(영문 RSS — 주소가 곧 원문)
 */
export class AiTitleAdapter implements AiTitleSource {
  constructor(private readonly market: () => MarketApi) {}

  async recentTitles(since: Date): Promise<AiTitle[]> {
    const [kr, coin] = await Promise.all([
      this.market().krNewsTitlesForAiBody(since, KR_LIMIT),
      prisma.newsArticle.findMany({
        where: { publishedAt: { gte: since } },
        select: { id: true, title: true, url: true, source: true, symbols: true, publishedAt: true },
        orderBy: { publishedAt: "asc" },
        take: COIN_LIMIT,
      }),
    ]);
    return [
      ...kr.map((t): AiTitle => ({
        key: `kr:${t.serial}`, market: "kr", title: t.title, publishedAt: t.publishedAt, outletName: t.providerName, directUrl: null,
        symbols: t.codes,
      })),
      ...coin
        .filter((a) => a.symbols.length >= 1 && a.symbols.length <= 2)
        .map((a): AiTitle => {
          const portal = a.source.startsWith("GoogleNews");
          return {
            key: `coin:${a.id}`,
            market: "coin",
            title: a.title,
            publishedAt: a.publishedAt,
            outletName: portal ? titleOutletSuffix(a.title) : a.source,
            // 구글 뉴스 주소는 중계 주소다 — 원문은 매체 RSS 로 잇는다(포털을 거치지 않는다)
            directUrl: portal ? null : a.url,
            symbols: a.symbols.map((s) => s.toUpperCase()),
          };
        }),
    ];
  }
}
