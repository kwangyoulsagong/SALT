"use client";

import { Badge } from "@repo/ui/badge";
import { Image } from "@repo/ui/image";
import { formatRelativeTime } from "@repo/web-shared/lib";

import type { NewsArticleView } from "../../lib/newsArticle";
import { NEWS_MESSAGES as M } from "../../model/newsMessages";

import * as s from "./News.css";
import { NewsTagChips } from "./NewsTagChips";

/**
 * 뉴스 행 한 줄(`FE-REQ-065`) — 코인 프리뷰 · 국내 프리뷰 · 국내 상세 "오늘 소식" · 모달 아래 목록이 같이 쓴다(세 벌 → 한 벌).
 * 제목 한 줄 · 요약 두 줄(있을 때) · `출처 ・ N분 전` · 공시/시황 칩(국내) · 측정 태그 칩(F017 단계 6 — 종류를 맞힌 소식만) · 썸네일(있을 때). **행 전체가 단추** — 누르면 모달(원문 링크는 모달 안에만)
 */
export const NewsRow = ({ article, onOpen }: { article: NewsArticleView; onOpen: (el: HTMLElement) => void }) => (
  <button type="button" className={s.row} aria-label={M.openLabel(article.title)} onClick={(e) => onOpen(e.currentTarget)}>
    <span className={s.rowText}>
      <span className={s.rowTitle} title={article.title}>
        {article.title}
      </span>
      {article.summary && <span className={s.rowSummary}>{article.summary}</span>}
      <span className={s.meta}>
        <span>{M.meta(article.source, formatRelativeTime(article.publishedAt))}</span>
        {article.badge && article.badge.label !== article.source && (
          <Badge size="sm" tone={article.badge.tone}>
            {article.badge.label}
          </Badge>
        )}
      </span>
      {article.tag && <NewsTagChips tag={article.tag} />}
    </span>
    {article.imageUrl && <Image className={s.thumb} src={article.imageUrl} alt="" loading="lazy" width={72} height={60} radius={6} />}
  </button>
);
