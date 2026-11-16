import type { ArticleDraft, NewsDayResult, NewsFeedPort, NewsGapFeedPort } from "../domain";
import { englishNewsFeed } from "./EnglishNewsFeed";
import { koreanNewsFeed } from "./KoreanNewsFeed";

/**
 * `NewsFeedPort` 구현 — 영문·한글 수집기를 하나로 묶는다.
 *
 * 유스케이스는 소스가 RSS 인지 API 인지, 몇 곳인지 모른다. 소스를 추가·제거하는 변화는
 * 이 파일에서 끝난다.
 *
 * 빈 날 다시 검색(`NewsGapFeedPort`, `SRV-REQ-057` FR-8)은 한글 검색 피드만 — 영어 매체 RSS 는 날짜 검색이 없어 못 메운다.
 */
export class RssNewsFeed implements NewsFeedPort, NewsGapFeedPort {
  fetchEnglish(): Promise<ArticleDraft[]> {
    return englishNewsFeed.fetchAllNews();
  }

  fetchKorean(): Promise<ArticleDraft[]> {
    return koreanNewsFeed.fetchAllKoreanNews();
  }

  fetchKoreanDay(day: string): Promise<NewsDayResult> {
    return koreanNewsFeed.fetchKoreanDay(day);
  }
}
