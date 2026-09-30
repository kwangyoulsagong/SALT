/**
 * 라우팅 파일은 re-export 만 한다 (`FE-REQ-009` FR-12).
 * 화면은 `src/pages/not-found` 슬라이스에 있다 (`FE-REQ-044` P-15).
 */
export { NotFoundPage as default, metadata } from "@/pages/not-found";
