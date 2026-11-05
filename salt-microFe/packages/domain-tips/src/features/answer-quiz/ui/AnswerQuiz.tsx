"use client";

// 클라이언트 잎: 고른 보기 · 채점 결과 상태를 갖는다. 문제 · 보기 문장은 서버 컴포넌트가 내려 준 그대로(ISR 본문에 들어 있다)
import Link from "next/link";
import { useId } from "react";

import { ROUTES } from "@repo/web-shared/config";

import type { TipQuiz } from "@/entities/tip";

import { useAnswerQuiz } from "../api";
import { ANSWER_QUIZ_MESSAGES as M } from "../model";
import * as s from "./quiz.css";

/**
 * 읽기 전에 맞혀 보기(`FE-REQ-058` FR-5 · FEATURE-014 FR-8). 정답은 화면이 모른다 — 고르면 서버가 채점하고 정답 번호 · 풀이를 준다.
 * 시간 제한 · 점수 · 연속 기록 0. 로그인했으면 처음 맞힌 때 한 번 "카드에 담았어요", 아니면 기록 없이 채점만.
 */
export const AnswerQuiz = ({ slug, quiz }: { slug: string; quiz: TipQuiz }) => {
  const titleId = useId();
  const answer = useAnswerQuiz(slug);
  const result = answer.data;
  const picked = answer.variables;

  const variant = (index: number) => {
    if (!result) return "idle";
    if (index === result.answer) return "right";
    return index === picked ? "pickedWrong" : "rest";
  };

  return (
    <section className={s.quiz} aria-labelledby={titleId}>
      <p className={s.eyebrow}>{M.eyebrow}</p>
      <h2 id={titleId} className={s.question}>
        {quiz.question}
      </h2>
      <ul className={s.choices} aria-label={M.choicesLabel}>
        {quiz.choices.map((choice, index) => (
          <li key={choice}>
            <button
              type="button"
              className={s.choice[variant(index)]}
              disabled={answer.isPending || Boolean(result)}
              aria-pressed={picked === index}
              onClick={() => answer.mutate(index)}
            >
              {choice}
              {result && index === result.answer ? <span className={s.choiceTag}>{M.rightChoice}</span> : null}
              {result && index === picked && index !== result.answer ? <span className={s.choiceTag}>{M.picked}</span> : null}
            </button>
          </li>
        ))}
      </ul>
      <div className={s.result} role="status" aria-live="polite">
        {answer.isError ? <p className={s.line}>{M.failed}</p> : null}
        {result ? (
          <>
            <p className={s.verdict}>{result.correct ? M.correct : M.wrong}</p>
            {result.correct ? null : <p className={s.line}>{M.answerIs(quiz.choices[result.answer] ?? "")}</p>}
            <p className={s.line}>{result.explanation}</p>
            <div className={s.footer}>
              {result.signedIn ? (
                <>
                  {result.correct ? <span>{result.collected ? M.collected : M.alreadyCollected}</span> : null}
                  <Link className={s.link} href={ROUTES.tipCards}>
                    {M.cardsLink}
                  </Link>
                </>
              ) : result.correct ? (
                <span>{M.signInToCollect}</span>
              ) : null}
              <button type="button" className={s.retry} onClick={() => answer.reset()}>
                {M.retry}
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};
