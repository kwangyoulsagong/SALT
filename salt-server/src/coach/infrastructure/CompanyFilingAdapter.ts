import type { MarketApi } from "../../market/application/api";
import type { NewsApi } from "../../news/application/api";
import type { CompanyFact, CompanyFilingReader } from "../domain";

/** 공시 원천 이름 — 추출 사실(`PrismaAiBodyStore` 의 `DART 공시`)과 같은 칩 */
const DART_SOURCE_NAME = "DART 공시";

/** 접수일(YYYYMMDD) → 그날 0시 KST */
const kstDay = (ymd: string) => new Date(Date.UTC(Number(ymd.slice(0, 4)), Number(ymd.slice(4, 6)) - 1, Number(ymd.slice(6, 8))) - 9 * 3_600_000);

/**
 * 공시 목록 → 회사 사정 사실 ACL(F017 v4 2b+) — `news` 공개 API 의 목록 + `market` 공시 사건 규칙. 숫자 0(목록엔 숫자가 없다) ·
 * 알게 된 시각 = 처음 본 시각(백필은 오늘이지만 칸의 '최근'은 게시 시각으로 센다 — `companyBrief.ts`)
 */
export class CompanyFilingAdapter implements CompanyFilingReader {
  constructor(
    private readonly news: NewsApi,
    private readonly market: MarketApi,
  ) {}

  async recent(code: string, since: Date, limit: number): Promise<CompanyFact[]> {
    if (!/^\d{6}$/.test(code)) return [];
    const rows = await this.news.recentDartFilings(code, since, limit);
    if (rows.length === 0) return [];
    const kinds = await this.market.newsKindsOf("kr", "disclosure", rows.map((r) => ({ title: `${r.corpName} ${r.reportName}`, codes: 1 })));
    return rows.map((r, i) => ({
      who: r.corpName,
      what: r.what,
      amount: null,
      unit: null,
      comparedTo: null,
      whenText: null,
      eventKind: kinds[i] ?? "other",
      sourceKind: "disclosure",
      sourceName: DART_SOURCE_NAME,
      sourceUrl: r.url,
      publishedAt: kstDay(r.rceptDate),
      availableAt: r.firstSeenAt,
    }));
  }
}
