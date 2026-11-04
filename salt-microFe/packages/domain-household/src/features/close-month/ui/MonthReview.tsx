"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextArea } from "@repo/ui/textArea";

import { hasApiStatus } from "@repo/web-shared/api";

import { type HouseholdMonth, type ReviewQuestionKey } from "@/entities/household";

import { useCloseMonth } from "../api";
import { CLOSE_MESSAGES as M } from "../model";
import * as s from "./close.css";

const ANSWER_MAX = 300;

const FIELD: Record<ReviewQuestionKey, "satisfied" | "tryNext" | "knownNext"> = { satisfied: "satisfied", try_next: "tryNext", known_next: "knownNext" };

/**
 * 월 마감 리뷰 3문항(`FE-REQ-057` FR-7). 닫을 수 있는지 · 문항 키는 서버가 준다(`closable` · `reviewQuestions`). 답은 저장만 — 점수 · 평가 0.
 * 닫은 달은 같은 칸으로 답을 고친다. 실패하면 적은 답을 둔다(FR-10).
 */
export const MonthReview = ({ month }: { month: HouseholdMonth }) => {
  const save = useCloseMonth(month.month);
  const a = month.close?.answers;
  const [answers, setAnswers] = useState({ satisfied: a?.satisfied ?? "", tryNext: a?.tryNext ?? "", knownNext: a?.knownNext ?? "" });
  if (!month.close && !month.closable) return month.current ? <p className={s.note}>{M.notYet}</p> : null;

  const tooLong = Object.values(answers).some((v) => v.trim().length > ANSWER_MAX);
  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!tooLong) save.mutate(answers);
  };

  return (
    <form className={s.card} onSubmit={onSubmit} aria-label={M.title}>
      <h2 className={s.title}>{M.title}</h2>
      <p className={s.note}>{month.close ? M.closed : M.description}</p>
      {month.reviewQuestions.map((key) => (
        <TextArea
          key={key}
          label={M.questions[key]}
          value={answers[FIELD[key]]}
          onChange={(v) => setAnswers((prev) => ({ ...prev, [FIELD[key]]: v }))}
          maxLength={ANSWER_MAX}
          rows={2}
        />
      ))}
      <span className={s.note} role="status">
        {tooLong ? M.tooLong : save.isError ? (hasApiStatus(save.error, 400) ? M.notYet : M.failed) : save.isSuccess ? M.saved : ""}
      </span>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={tooLong || save.isPending} loading={save.isPending}>
          {month.close ? M.submitEdit : M.submitClose}
        </Button>
      </div>
    </form>
  );
};
