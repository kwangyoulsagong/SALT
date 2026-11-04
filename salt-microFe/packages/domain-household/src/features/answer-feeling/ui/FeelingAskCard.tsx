"use client";

import { useState } from "react";

import { Button } from "@repo/ui/button";

import { hasApiStatus } from "@repo/web-shared/api";

import { EMOTION_LABEL, FeltScale, formatWon, useCategoryLabel, type FeelingAsk } from "@/entities/household";

import { useAnswerFeeling } from "../api";
import { ANSWER_MESSAGES as M } from "../model";
import * as s from "./answer.css";

/**
 * "어제 단 기분, 지금은 어때요?"(`FE-REQ-057` FR-8). 물을 항목은 서버가 고른다(태그 다음 날 ~ 7일, 아직 안 정함) — 화면은 날짜를 세지 않는다.
 * 점수를 누르면 바로 저장 · 넘기기도 한 번. 평가 · 재촉 문구 0. 결과 문장은 항목이 사라져도 카드에 남는다.
 */
export const FeelingAskCard = ({ ym, asks }: { ym: string; asks: FeelingAsk[] }) => {
  const answer = useAnswerFeeling(ym);
  const categories = useCategoryLabel();
  const [last, setLast] = useState<"answered" | null>(null);
  if (asks.length === 0 && !last && !answer.isError) return null;

  return (
    <section className={s.card} aria-label={M.askTitle}>
      {asks.length > 0 ? (
        <>
          <h2 className={s.title}>{M.askTitle}</h2>
          <ul className={s.list}>
            {asks.map((a) => {
              const what = a.merchant ?? categories.category(a.category);
              const label = M.askLine(EMOTION_LABEL[a.emotion], what, formatWon(a.amount));
              const busy = answer.isPending && answer.variables?.expenseId === a.expenseId;
              return (
                <li key={a.expenseId} className={s.item}>
                  <span className={s.line}>
                    {label}
                    {a.feltNow !== null ? ` · ${M.askFeltNow(a.feltNow)}` : ""}
                  </span>
                  <div className={s.actions}>
                    <FeltScale
                      label={label}
                      value={null}
                      allowClear={false}
                      onChange={(felt) => {
                        if (answer.isPending || felt === null) return;
                        answer.mutate({ expenseId: a.expenseId, felt }, { onSuccess: () => setLast("answered") });
                      }}
                    />
                    <Button
                      size="sm"
                      variant="weak"
                      disabled={answer.isPending}
                      loading={busy && answer.variables?.felt === null}
                      onClick={() => answer.mutate({ expenseId: a.expenseId, felt: null }, { onSuccess: () => setLast("answered") })}
                    >
                      {M.pass}
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
      <p className={s.note} role="status">
        {answer.isError ? (hasApiStatus(answer.error, 409) ? M.decided : M.failed) : last === "answered" ? M.answered : ""}
      </p>
    </section>
  );
};
