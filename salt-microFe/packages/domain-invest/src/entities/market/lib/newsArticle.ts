import type { KrNewsItem } from "@repo/core/marketKr";
import type { ArticleBodyRef } from "@repo/core/newsBody";
import type { NewsTag } from "@repo/core/newsTag";

import type { NewsPreviewItem, SearchNews } from "../model/types";

/**
 * 뉴스 행 · 모달이 그리는 한 모양(`FE-REQ-065`) — 국내(KIS 제목) · 코인(크롤러 기사)을 같은 칸으로. 없는 칸은 `null`(그리지 않는다).
 * 국내는 요약 · 이미지 · 원문 링크가 원천에 없다. 본문은 모달이 열 때 `bodyRef` 로 따로 받는다(`FE-REQ-068` — 포털 검색으로 같은 기사를 찾아 서버가 뽑은 문단,
 * ~~`ADR-009` 본문 수집 0~~ 사용자 2026-11-09 정정 · 코인 RSS `content` 는 여전히 싣지 않는다 — 요약 조각이라)
 */
export interface NewsArticleView {
  id: string;
  title: string;
  source: string;
  publishedAt: string;
  summary: string | null;
  imageUrl: string | null;
  /** 원문 — 코인만 */
  url: string | null;
  /** 공시 · 시황 칩 — 국내만 */
  badge: { label: string; tone: "brand" | "neutral" } | null;
  /** 관련 종목 칩 — 이름 · 등락률(%, 모르면 `null`) · 갈 종목 코드/심볼 */
  related: Array<{ symbol: string; name: string; changeRate: number | null }>;
  /** 본문을 찾을 기사 — 공시는 기사가 아니라 `null`(`FE-REQ-068`) */
  bodyRef: ArticleBodyRef | null;
  /** 측정 태그(F017 단계 6) — 행 칩 · 모달 "같은 종류 과거 반응". 없으면 그리지 않는다 */
  tag: NewsTag | null;
}

export const krNewsToView = (n: KrNewsItem, kindLabel: string, code: string): NewsArticleView => ({
  id: n.id,
  title: n.title,
  source: n.provider,
  publishedAt: n.publishedAt,
  summary: null,
  imageUrl: null,
  url: null,
  badge: { label: kindLabel, tone: n.kind === "disclosure" ? "brand" : "neutral" },
  related: (n.related ?? []).map((r) => ({ symbol: r.code, name: r.name, changeRate: r.changeRate })),
  bodyRef: n.kind === "news" ? { kind: "kr", code, serial: n.id } : null,
  tag: n.tag ?? null,
});

/** 글자 · 숫자만 남긴 비교용 문자열 */
const bare = (t: string) => t.replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();

/**
 * 요약이 제목을 되풀이하면(뉴스 RSS 는 요약 = "제목 + 언론사"인 경우가 많다 — 2026-11-09 실화면) 요약을 그리지 않는다.
 * 같은 글을 행 · 모달에 두 번 보이지 않게
 */
export const meaningfulSummary = (title: string, summary: string | null): string | null => {
  if (!summary) return null;
  const t = bare(title.replace(/\s+-\s+[^-]+$/, ""));
  const s = bare(summary);
  return t.length > 0 && (s.startsWith(t) || t.startsWith(s)) ? null : summary;
};

/** 코인 기사 — 관련 종목은 그 기사를 부른 심볼 하나(서버가 태그 목록을 주지 않는다) */
export const coinNewsToView = (n: NewsPreviewItem, symbol: string, name: string): NewsArticleView => ({
  id: n.id,
  title: n.title,
  source: n.source,
  publishedAt: n.publishedAt,
  summary: meaningfulSummary(n.title, n.summary),
  imageUrl: n.imageUrl,
  url: n.url,
  badge: null,
  related: [{ symbol, name, changeRate: null }],
  bodyRef: { kind: "coin", id: n.id },
  tag: n.tag ?? null,
});

/**
 * 검색 모달 뉴스 결과 → 모달 한 모양(`FE-REQ-066` FR-8). 국내 본문은 관련 종목 첫 코드로 찾는다(서버 경로가 종목에 걸린 제목만 받는다) —
 * 종목이 없거나 공시면 본문을 찾지 않는다
 */
export const searchNewsToView = (n: SearchNews, kindLabel: (kind: "news" | "disclosure") => string): NewsArticleView => {
  const firstCode = n.related[0]?.symbol ?? null;
  return {
    id: n.id,
    title: n.title,
    source: n.source,
    publishedAt: n.publishedAt,
    summary: n.market === "crypto" ? meaningfulSummary(n.title, n.summary) : null,
    imageUrl: n.imageUrl,
    url: n.url,
    badge: n.kind ? { label: kindLabel(n.kind), tone: n.kind === "disclosure" ? "brand" : "neutral" } : null,
    related: n.related.map((r) => ({ symbol: r.symbol, name: r.name, changeRate: r.changeRate })),
    bodyRef:
      n.market === "crypto"
        ? { kind: "coin", id: n.id }
        : n.kind === "news" && firstCode
          ? { kind: "kr", code: firstCode, serial: n.id }
          : null,
    // 검색 결과엔 태그가 없다(검색 뉴스 묶음은 F017 단계 6 범위 밖 — 모달은 태그 칸 없이)
    tag: null,
  };
};
