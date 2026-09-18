import { backendApi } from "./backend-api.service";
import {
  toNewsPreviewViewModels,
  type NewsPreviewVM,
  type ServerNewsArticle,
} from "./news.viewmodel";

/** 프리뷰가 한 번에 받는 기사 수의 기본값·상한 (`BFF-REQ-008`). */
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

class AppNewsService {
  /**
   * 종목 뉴스.
   *
   * 서버 `/news` 는 **공개 경로**다. 그래서 이 경로도 인증을 요구하지 않는다 —
   * 같은 패널의 차트·심리도 공개이고, 뉴스만 막으면 로그인 전 화면에서 그 블록만
   * 비어 보인다. (`BFF-REQ-008` 표는 Auth Y 로 적었다. 그 차이는 체크리스트에 남긴다.)
   */
  async listBySymbol(
    symbol: string,
    limit: number = DEFAULT_LIMIT,
  ): Promise<{ items: NewsPreviewVM[] }> {
    const safeLimit = Math.min(Math.max(1, Math.trunc(limit)), MAX_LIMIT);

    const response = await backendApi.proxyRequest(
      "GET",
      `/news?symbol=${encodeURIComponent(symbol.toUpperCase())}&limit=${safeLimit}`,
    );

    const articles: ServerNewsArticle[] =
      response.data?.data?.articles ?? [];

    return { items: toNewsPreviewViewModels(articles) };
  }
}

export const appNewsService = new AppNewsService();
