"use client";

import Link from "next/link";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { hasApiStatus } from "@repo/web-shared/api";
import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { formatTipDate } from "@/entities/tip";

import { useQuizCards } from "../api";
import { QUIZ_CARDS_PAGE as M } from "../model";
import * as s from "./quizCards.css";

/** 맞힌 카드 잎 — 세션이 있어야 그린다. 수 · 순서 · 숨길 카드는 서버 값(원문에서 빠진 글의 카드는 서버가 뺀다) */
export const QuizCardList = () => {
  const view = useQuizCards();
  // 세션이 만료돼 갱신까지 실패한 401 도 로그아웃이다 — "불러오지 못했어요"는 서버 고장으로 읽힌다(공개 zone 은 로그인으로 보내지 않는다)
  if (view.isSignedOut || (view.isError && hasApiStatus(view.error, 401))) return <EmptyState title={M.signedOut} />;
  if (view.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!view.data) return <Skeleton height={240} />;
  const { available, cards } = view.data;
  if (available === 0) return <EmptyState title={M.notPublic} />;
  return (
    <>
      <p className={s.count}>{M.count(cards.length, available)}</p>
      {cards.length === 0 ? (
        <EmptyState title={M.emptyTitle} description={M.emptyDescription} />
      ) : (
        <ul className={s.list}>
          {cards.map((card) => (
            <li key={card.slug} className={s.card}>
              <p className={s.cardTitle}>{card.title}</p>
              <p className={s.question}>{card.question}</p>
              <p className={s.answer}>
                <span className={s.answerLabel}>{M.answer}</span>
                {card.answer}
              </p>
              <p className={s.explanation}>{card.explanation}</p>
              <div className={s.foot}>
                <span>
                  {M.collectedOn} {formatTipDate(card.collectedAt)}
                </span>
                <Link href={ROUTES.tip(card.slug)} className={s.link}>
                  {M.readTip}
                  <NavChevron />
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
