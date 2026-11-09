"use client";

import Link from "next/link";

import { Badge } from "@repo/ui/badge";
import { Image } from "@repo/ui/image";
import { Modal } from "@repo/ui/modal";
import { ROUTES } from "@repo/web-shared/config";
import { formatRelativeTime } from "@repo/web-shared/lib";

import type { NewsArticleView } from "../../lib/newsArticle";
import { NEWS_MESSAGES as M } from "../../model/newsMessages";

import * as s from "./News.css";
import { NewsRow } from "./NewsRow";

const MINUS = "−";
const rateTone = (v: number) => (Number(Math.abs(v).toFixed(2)) === 0 ? "flat" : v > 0 ? "up" : "down");
const rateText = (v: number) => `${v > 0 ? "+" : v < 0 ? MINUS : ""}${Math.abs(v).toFixed(2)}%`;

/**
 * 뉴스 상세 모달(`FE-REQ-065`) — `@repo/ui` `Modal` `size="article"`(포커스 가둠 · Esc · 스크롤 잠금은 그 컴포넌트). 열고 닫기는 주소(`useNewsModal`).
 * 국내: 머리 · 칩 · "본문은 제공처에서" · 이 종목 오늘 소식. 코인: 머리 · 칩 · 이미지 · 요약 · 원문 보기(새 탭) · 주요 뉴스. 기사 본문 재게시 0
 */
export const NewsModal = ({
  article,
  more,
  moreTitle,
  onSelect,
  onClose,
}: {
  article: NewsArticleView | null;
  more: NewsArticleView[];
  moreTitle: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) => (
  <Modal open={article !== null} onClose={onClose} size="article" title={article?.title} label={M.dialogLabel}>
    {article && (
      <div className={s.modalBody}>
        <span className={s.meta}>
          <span>{M.meta(article.source, formatRelativeTime(article.publishedAt))}</span>
          {article.badge && article.badge.label !== article.source && (
            <Badge size="sm" tone={article.badge.tone}>
              {article.badge.label}
            </Badge>
          )}
        </span>
        {article.related.length > 0 && (
          <nav className={s.chips} aria-label={M.relatedHeading}>
            {article.related.map((r) => (
              <Link key={r.symbol} href={ROUTES.investmentDetail(r.symbol)} prefetch={false} className={s.chip}>
                {r.name}
                {r.changeRate !== null && <span className={s.chipRate[rateTone(r.changeRate)]}>{rateText(r.changeRate)}</span>}
              </Link>
            ))}
          </nav>
        )}
        {article.imageUrl && <Image className={s.hero} src={article.imageUrl} alt="" width="100%" radius={16} />}
        {article.summary && <p className={s.summary}>{article.summary}</p>}
        {article.url ? (
          <a className={s.original} href={article.url} target="_blank" rel="noopener noreferrer" aria-label={M.openOriginalLabel(article.source)}>
            {M.openOriginal}
          </a>
        ) : (
          <p className={s.note}>{M.krNoBody}</p>
        )}
        {more.length > 0 && (
          <>
            <h3 className={s.sectionTitle}>{moreTitle}</h3>
            <div className={s.list}>
              {more.map((m) => (
                <NewsRow key={m.id} article={m} onOpen={() => onSelect(m.id)} />
              ))}
            </div>
          </>
        )}
      </div>
    )}
  </Modal>
);
