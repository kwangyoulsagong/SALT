import { createNewsApplication } from "./news/application/api";
import { PrismaArticleRepository } from "./news/infrastructure/PrismaArticleRepository";
import { PrismaBookmarkRepository } from "./news/infrastructure/PrismaBookmarkRepository";
import { RssNewsFeed } from "./news/infrastructure/RssNewsFeed";
import { createNewsRouter } from "./news/presentation/news.routes";

/**
 * 조립 지점 — **구현을 아는 유일한 자리**다.
 *
 * ## 왜 진입점인가 (Open Question 7-6 의 답)
 *
 * 레이어 규칙이 자리를 정한다. `application` 은 `infrastructure` 를 import 할 수 없고
 * (의존 역전), `presentation` 도 마찬가지다. 컨텍스트 안 어디에도 "Prisma 리포지토리를
 * 골라 유스케이스에 꽂는" 코드를 둘 자리가 없다 — 그게 의도다.
 *
 * 그래서 그 코드는 **레이어 밖**, 즉 `src/` 최상위 진입 파일에 있다. 훅은 최상위
 * 파일(`area: "entry"`)에 규칙을 걸지 않고, 그 예외가 성립하는 이유가 이것이다.
 *
 * DI 컨테이너를 쓰지 않는다. 여기 있는 것은 생성자 호출뿐이고, **무엇이 무엇에
 * 꽂혔는지 읽어서 알 수 있는 것**이 리플렉션보다 중요하다.
 *
 * > 컨텍스트가 늘면 이 파일이 길어진다. 그때 나누는 기준은 **컨텍스트**이고,
 * > `src/composition/` 디렉터리를 만들지 않는다 — 레지스트리에 없는 컨텍스트로
 * > 잡혀 훅이 막는다. `src/composition.<context>.ts` 로 나눈다.
 */

const news = createNewsApplication({
  articles: new PrismaArticleRepository(),
  bookmarks: new PrismaBookmarkRepository(),
  feed: new RssNewsFeed(),
});

/** 다른 컨텍스트와 워커가 부르는 공개 API 모음. */
export const contextApis = {
  news: news.api,
};

/** 컨텍스트가 자기 유스케이스를 직접 돌려야 하는 곳(워커·관리 작업)이 쓴다. */
export const contextUseCases = {
  news: news.useCases,
};

/** `app.ts` 가 등록하는 라우터. 경로는 `app.ts` 가 정한다. */
export const contextRouters = {
  news: createNewsRouter(news.useCases),
};
