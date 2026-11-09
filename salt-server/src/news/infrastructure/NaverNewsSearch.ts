import { createHttpClient } from "../../shared/infrastructure/httpClient";
import type { ArticleCandidate, ArticleSearchPort } from "../domain";

/** 포털 뉴스 검색 API(API 게이트웨이 판) — 키 헤더 이름은 게이트웨이 규약. 하루 25,000회 · 우리는 모달을 처음 열 때 한 번 */
const SEARCH_URL = "https://naverapihub.apigw.ntruss.com/search/v1/news";
const DISPLAY = 10;

interface SearchItem {
  title: string;
  originallink: string;
  link: string;
  pubDate: string;
}

const ENTITIES: Record<string, string> = { "&quot;": '"', "&amp;": "&", "&lt;": "<", "&gt;": ">", "&apos;": "'", "&#39;": "'" };
const plain = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&(quot|amp|lt|gt|apos|#39);/g, (m) => ENTITIES[m] ?? m);

/** 포털이 기사를 품은 주소(본문 칸이 일정) — 언론사 원문과 같으면 품지 않은 것 */
const portalUrlOf = (item: SearchItem): string | null => {
  try {
    const host = new URL(item.link).hostname;
    return host === "n.news.naver.com" || host === "news.naver.com" ? item.link : null;
  } catch {
    return null;
  }
};

/**
 * 포털 뉴스 검색(`SRV-REQ-054` FR-1) — 제목으로 정확도순 10건. 키가 없으면 꺼짐(`enabled = false`). 실패는 던진다(캐시가 "실패"로 남긴다).
 * 원문 응답 · 키를 로그에 남기지 않는다
 */
export class NaverNewsSearch implements ArticleSearchPort {
  private readonly http;

  constructor(private readonly keys: { id?: string; secret?: string }) {
    this.http = createHttpClient({ timeoutMs: 5_000 });
  }

  get enabled(): boolean {
    return Boolean(this.keys.id && this.keys.secret);
  }

  async search(query: string): Promise<ArticleCandidate[]> {
    const { data } = await this.http.get<{ items?: SearchItem[] }>(SEARCH_URL, {
      params: { query, display: DISPLAY, sort: "sim" },
      headers: { "X-NCP-APIGW-API-KEY-ID": this.keys.id ?? "", "X-NCP-APIGW-API-KEY": this.keys.secret ?? "" },
    });
    return (data.items ?? []).flatMap((item) => {
      const publishedAt = new Date(item.pubDate);
      if (Number.isNaN(publishedAt.getTime()) || !item.originallink) return [];
      return [{ title: plain(item.title), originalUrl: item.originallink, portalUrl: portalUrlOf(item), publishedAt }];
    });
  }
}
