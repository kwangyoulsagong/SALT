import { SEARCH_PAGE } from "../model";
import { srOnly } from "./SearchPage.css";

/**
 * 종목 검색 (`/search`) — 서버 컴포넌트. **모달이 본문이다**(`FE-REQ-066` D5): 이 주소로 오면 머리의 `SearchLauncher` 가 모달을
 * 연 채 그린다(모달은 그 하나 — 두 벌이 겹치지 않게). 페이지는 화면 리더용 제목 하나만 둔다. 닫으면 투자 화면으로 간다.
 * 주소 `?q=` 는 그대로 읽힌다(`FE-REQ-011` FR-80 — 링크 · 새로고침 호환)
 */
export const SearchPage = () => (
  <div>
    <h1 className={srOnly}>{SEARCH_PAGE.title}</h1>
  </div>
);

export default SearchPage;
