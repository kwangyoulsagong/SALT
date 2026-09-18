import {
  NEWS_ANALYSIS_SYMBOLS,
  SYMBOL_KEYWORDS,
  analyzeNewsSentiment,
  type NewsAnalysisResult,
  type NewsProbe,
} from "../domain";

/** 분석 창과 표본 상한. 원문 그대로다. */
const WINDOW_HOURS = 24;
const ARTICLE_LIMIT = 20;

/**
 * 뉴스 감성 분석.
 *
 * 사전에 있는 심볼 여덟 개를 **동시에** 분석한다. 기사 조회는 `news` 의 공개 API 가
 * 하고(`NewsProbe`), 점수는 `domain/policy/newsSentiment` 가 매긴다 —
 * 이 클래스는 둘을 잇기만 한다(`ddd-application.md` §2).
 *
 * 워커(10분 주기)와 추천 생성이 같은 유스케이스를 부른다.
 */
export class AnalyzeNewsSentiment {
  constructor(private readonly news: NewsProbe) {}

  async execute(now: Date = new Date()): Promise<Map<string, NewsAnalysisResult>> {
    const since = new Date(now.getTime() - WINDOW_HOURS * 60 * 60 * 1000);
    const results = new Map<string, NewsAnalysisResult>();

    await Promise.all(
      NEWS_ANALYSIS_SYMBOLS.map(async (symbol) => {
        const articles = await this.news.findArticlesForSentiment({
          symbol,
          keywords: SYMBOL_KEYWORDS[symbol] ?? [],
          since,
          limit: ARTICLE_LIMIT,
        });

        const result = analyzeNewsSentiment(symbol, articles, now);
        if (result) results.set(symbol, result);
      })
    );

    return results;
  }
}
