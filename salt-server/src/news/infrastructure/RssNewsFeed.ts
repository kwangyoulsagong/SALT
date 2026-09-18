import type { ArticleDraft, NewsFeedPort } from "../domain";
import { englishNewsFeed } from "./EnglishNewsFeed";
import { koreanNewsFeed } from "./KoreanNewsFeed";

/**
 * `NewsFeedPort` 구현 — 영문·한글 수집기를 하나로 묶는다.
 *
 * 유스케이스는 소스가 RSS 인지 API 인지, 몇 곳인지 모른다. 소스를 추가·제거하는 변화는
 * 이 파일에서 끝난다.
 */
export class RssNewsFeed implements NewsFeedPort {
  fetchEnglish(): Promise<ArticleDraft[]> {
    return englishNewsFeed.fetchAllNews();
  }

  fetchKorean(): Promise<ArticleDraft[]> {
    return koreanNewsFeed.fetchAllKoreanNews();
  }
}
