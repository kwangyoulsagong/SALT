import type { Metadata } from "next";

import type { TipDetail } from "@/entities/tip";

/**
 * 글 메타데이터 — 확인 필요 글은 noindex(FR-2), 공개 전이면 글 자체가 404 라 여기 오지 않는다.
 * 없는 글은 `notFound()` 가 404 메타를 쓴다.
 */
export const tipMetadata = (tip: TipDetail | null): Metadata =>
  tip
    ? { title: tip.title, description: tip.summary, robots: tip.noindex ? { index: false, follow: false } : { index: true, follow: true } }
    : { robots: { index: false, follow: false } };
