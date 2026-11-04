"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { labelOr } from "@repo/web-shared/lib";

import { formatWon, type CategoryKey } from "@/entities/expense";

import { useParseInput, useRecordExpense } from "../api";
import { RECORD_MESSAGES as M } from "../model";
import { CategoryChips } from "./CategoryChips";
import * as s from "./record.css";
import { SaveResult } from "./SaveResult";

/**
 * 한 줄로 적기(`FE-REQ-057` FR-2 · FEATURE-013 FR-2) — "점심 12000"을 서버가 읽고(금액은 정규식으로 확정, 분류는 제안) 확인 뒤 저장.
 * 분류를 못 고르면 저장 버튼 대신 바로 적기 쪽으로 넘기지 않고 이 자리에서 고르게 한다 — 제안 실패가 저장을 막지 않는다.
 */
export const LineEntry = () => {
  const parse = useParseInput();
  const record = useRecordExpense();
  const [text, setText] = useState("");
  const candidate = parse.data?.candidates[0] ?? null;
  const [picked, setPicked] = useState<CategoryKey | null>(null);
  const category = picked ?? candidate?.category ?? null;

  const onParse = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    setPicked(null);
    parse.mutate({ mode: "line", text });
  };

  const onSave = () => {
    if (!candidate || !category) return;
    record.mutate(
      {
        amount: candidate.amount,
        category,
        spentOn: candidate.spentOn,
        ...(candidate.merchant ? { merchant: candidate.merchant } : {}),
        inputKind: "line",
      },
      { onSuccess: () => { setText(""); parse.reset(); } },
    );
  };

  const errorCode = isApiError(record.error) ? record.error.code : null;

  return (
    <div className={s.form}>
      <form onSubmit={onParse} aria-label={M.modes.line} className={s.form}>
        <TextField label={M.line} value={text} onChange={setText} placeholder={M.linePlaceholder} maxLength={200} autoFocus />
        <Button type="submit" variant="secondary" disabled={!text.trim() || parse.isPending} loading={parse.isPending}>
          {M.lineParse}
        </Button>
      </form>
      {parse.data && !candidate ? <span className={s.hint}>{M.lineNoAmount}</span> : null}
      {candidate ? (
        <div className={s.candidate}>
          <div className={s.candidateHead}>
            <span className={s.value}>{candidate.merchant ?? "—"}</span>
            <span className={s.value}>{formatWon(candidate.amount)}</span>
          </div>
          <CategoryChips value={category} onChange={setPicked} />
          {candidate.categorySource ? <span className={s.hint}>{M.categoryFrom[candidate.categorySource]}</span> : null}
          <span className={s.hint} role="status">
            {record.isError ? labelOr(M.errorCode, errorCode, M.failed) : ""}
          </span>
          <Button onClick={onSave} disabled={!category || record.isPending} loading={record.isPending}>
            {M.submit}
          </Button>
        </div>
      ) : null}
      {record.data && record.isSuccess ? <SaveResult result={record.data} /> : null}
    </div>
  );
};
