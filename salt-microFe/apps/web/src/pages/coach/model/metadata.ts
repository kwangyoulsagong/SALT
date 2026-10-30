import { privatePageMetadata } from "@/shared/config";

/** 내 보유 · 판단 리포트 — 검색에 싣지 않는다 */
export const metadata = privatePageMetadata("코치 리포트");

/** 판정 근거 상세 — 로그인해야 보이는 성적표라 검색에 싣지 않는다 */
export const signalEvidenceMetadata = privatePageMetadata("판정 근거");
