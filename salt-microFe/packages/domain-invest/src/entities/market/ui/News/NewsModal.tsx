"use client";

import Link from "next/link";

import { Badge } from "@repo/ui/badge";
import { Image } from "@repo/ui/image";
import { Modal } from "@repo/ui/modal";
import { Skeleton } from "@repo/ui/skeleton";
import { ROUTES } from "@repo/web-shared/config";
import { formatRelativeTime } from "@repo/web-shared/lib";

import { useArticleBody } from "../../api/useArticleBody";
import type { NewsArticleView } from "../../lib/newsArticle";
import { NEWS_MESSAGES as M } from "../../model/newsMessages";

import * as s from "./News.css";
import { NewsRow } from "./NewsRow";
import { NewsTagReaction } from "./NewsTagReaction";

const MINUS = "−";
const rateTone = (v: number) => (Number(Math.abs(v).toFixed(2)) === 0 ? "flat" : v > 0 ? "up" : "down");
const rateText = (v: number) => `${v > 0 ? "+" : v < 0 ? MINUS : ""}${Math.abs(v).toFixed(2)}%`;

const OriginalLink = ({ article }: { article: NewsArticleView }) =>
  article.url ? (
    <a className={s.original} href={article.url} target="_blank" rel="noopener noreferrer" aria-label={M.openOriginalLabel(article.source)}>
      {M.openOriginal}
    </a>
  ) : null;

/**
 * 본문 칸(`FE-REQ-068`) — 받는 동안 줄 자리(높이를 지킨다) · 찾으면 문단 + 출처 · 원문 단추 · 못 찾으면 예전 그대로(코인 요약 + 원문 · 국내 "제공처에서").
 * 문단은 서버가 글자만 준다 — `<p>` 로만 그린다(HTML 해석 0)
 */
const ArticleBodyBlock = ({ article }: { article: NewsArticleView }) => {
  // 받는 중일 때만 줄 자리 — 부르지 않는 기사(공시 · 비로그인)는 바로 예전 모양(v5 `isPending` 은 꺼진 쿼리도 참이다)
  const { data, isLoading } = useArticleBody(article.bodyRef);
  if (isLoading) {
    return (
      <div className={s.article} aria-busy="true" aria-label={M.bodyLoading}>
        <Skeleton lines={5} height={16} />
      </div>
    );
  }
  if (data?.status === "ok") {
    const original = data.originalUrl ?? article.url;
    return (
      <div className={s.article}>
        {data.paragraphs.map((p, i) => (
          <p key={i} className={s.paragraph}>
            {p}
          </p>
        ))}
        <div className={s.sourceRow}>
          <span className={s.note}>{M.bodySource(article.source)}</span>
          <OriginalLink article={{ ...article, url: original }} />
        </div>
      </div>
    );
  }
  return (
    <>
      {article.summary && <p className={s.summary}>{article.summary}</p>}
      {article.url ? <OriginalLink article={article} /> : <p className={s.note}>{M.krNoBody}</p>}
    </>
  );
};

/**
 * 뉴스 상세 모달(`FE-REQ-065`) — `@repo/ui` `Modal` `size="article"`(포커스 가둠 · Esc · 스크롤 잠금은 그 컴포넌트). 열고 닫기는 주소(`useNewsModal`).
 * 국내: 머리 · 칩 · 본문(찾으면 — `FE-REQ-068`, 못 찾으면 "본문은 제공처에서") · 이 종목 오늘 소식.
 * 코인: 머리 · 칩 · 이미지 · 본문(못 찾으면 요약) · 원문 보기(새 탭) · 주요 뉴스
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
        {/* 측정 태그는 본문 위 — 본문이 길면 아래 칸은 안 보인다(2026-11-12 실화면) */}
        {article.tag && <NewsTagReaction tag={article.tag} />}
        <ArticleBodyBlock key={article.id} article={article} />
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
