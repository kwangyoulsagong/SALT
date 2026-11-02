/**
 * 라우팅 파일은 re-export 만 한다 (`FE-REQ-009` FR-12).
 * 404 는 zone 이 같이 쓴다 — `@repo/web-shared/layout`(`FE-REQ-044` P-15 → `FE-REQ-053`). `@/app` 이 다시 연다.
 */
export { NotFoundPage as default, notFoundMetadata as metadata } from "@/app";
