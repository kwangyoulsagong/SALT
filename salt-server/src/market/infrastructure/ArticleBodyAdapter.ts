import type { NewsApi } from "../../news/application/api";
import type { KrArticleBodyPort, KrArticleBodyView } from "../domain";

/**
 * 기사 본문 ACL(`SRV-REQ-054`) — `news` 공개 API 를 우리 Port 로. 국내 시황 제목이 부른다. 이름은 가져오는 것(`ddd-infrastructure.md` §5)
 */
export class ArticleBodyAdapter implements KrArticleBodyPort {
  constructor(private readonly news: NewsApi) {}

  async read(query: { key: string; title: string; publishedAt: Date }): Promise<KrArticleBodyView> {
    const view = await this.news.readArticleBody(query);
    return { status: view.status, paragraphs: view.paragraphs, originalUrl: view.originalUrl, fetchedAt: view.fetchedAt };
  }
}
