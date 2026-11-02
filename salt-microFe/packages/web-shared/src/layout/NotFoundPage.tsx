import { Illustration } from "@repo/ui/illustration";
import { privatePageMetadata, ROUTES } from "../config";
import { ZoneLink } from "../ui";
import { NOT_FOUND_MESSAGES } from "./messages";
import { description, link, page, title } from "./NotFoundPage.css";

export const notFoundMetadata = privatePageMetadata("찾을 수 없음");

/**
 * 404 (`FE-REQ-044` P-15) — 서버 컴포넌트.
 *
 * Next 기본 404 는 영문 한 줄이라 앱 밖으로 떨어진 느낌을 준다. 캔들 장면 + 한 줄 + 돌아갈 길 하나.
 * `notFound()` 는 상세 화면(잘못된 종목 코드)에서 부른다.
 *
 * zone 마다 404 가 따로 필요해 셸 `pages/not-found` 에서 공용 레이아웃으로 올렸다(`FE-REQ-053`). 투자 화면으로 가는 링크는
 * `ZoneLink` — 셸에서는 zone 을 넘고, 투자 zone 에서는 같은 앱이다.
 *
 * `<main>` 은 `AppShell` 하나뿐이라 여기는 `div` 이고, 제목이 이 화면의 `h1` 이다(axe
 * `landmark-no-duplicate-main` · `page-has-heading-one`). 그래서 `EmptyState`(제목이 `p`)를 쓰지 않았다.
 */
export const NotFoundPage = () => (
  <div className={page}>
    <Illustration scene="candles" size="lg" />
    <h1 className={title}>{NOT_FOUND_MESSAGES.title}</h1>
    <p className={description}>{NOT_FOUND_MESSAGES.description}</p>
    <ZoneLink href={ROUTES.investments} className={link}>
      {NOT_FOUND_MESSAGES.toInvestments}
    </ZoneLink>
  </div>
);
