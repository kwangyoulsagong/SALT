"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { TextArea } from "@repo/ui/textArea";

import { isApiError } from "@repo/web-shared/api";
import { labelOr } from "@repo/web-shared/lib";

import { formatDay, formatWon, type CategoryKey, type ExpenseRequest, type ParseCandidate } from "@/entities/household";

import { useParseInput, useRecordExpenses } from "../api";
import { RECORD_MESSAGES as M } from "../model";
import { CategoryChips } from "./CategoryChips";
import * as s from "./record.css";
import { SaveResult } from "./SaveResult";

interface Row {
  candidate: ParseCandidate;
  include: boolean;
  category: CategoryKey | null;
}

const count = (skipped: string[], key: string) => skipped.filter((k) => k === key).length;

/**
 * 결제 문자 붙여넣기(`FE-REQ-057` FR-3 · FEATURE-013 FR-3) — 여러 건 → 후보 목록(체크 · 분류 고치기) → 한 번에 저장.
 * **원문은 이 컴포넌트 상태에만** 있다 — 읽기를 누르면 바로 비우고(서버로 한 번 보낸 뒤), localStorage · 로그 · 쿼리 캐시에 두지 않는다(수용 기준 3).
 */
export const PasteEntry = () => {
  const parse = useParseInput();
  const record = useRecordExpenses();
  const [text, setText] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  const onParse = (event: FormEvent) => {
    event.preventDefault();
    if (!text.trim()) return;
    const sent = text;
    // 원문은 보낸 즉시 비운다 — 화면 상태에도 남기지 않는다
    setText("");
    parse.mutate(
      { mode: "messages", text: sent },
      { onSuccess: (r) => setRows(r.candidates.map((c) => ({ candidate: c, include: true, category: c.category }))) },
    );
  };

  const update = (index: number, patch: Partial<Row>) => setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const chosen = rows.filter((r) => r.include);
  const ready = chosen.length > 0 && chosen.every((r) => r.category !== null);

  const onSave = () => {
    if (!ready) return;
    const body: ExpenseRequest[] = chosen.map(({ candidate: c, category }) => ({
      amount: c.amount,
      category: category as CategoryKey,
      spentOn: c.spentOn,
      paymentMethod: c.paymentMethod,
      inputKind: "paste",
      ...(c.merchant ? { merchant: c.merchant } : {}),
      ...(c.installmentMonths ? { installmentMonths: c.installmentMonths } : {}),
    }));
    record.mutate(body, { onSuccess: () => { setRows([]); parse.reset(); } });
  };

  const errorCode = isApiError(record.error) ? record.error.code : isApiError(parse.error) ? parse.error.code : null;
  const skipped = parse.data?.skipped ?? [];

  return (
    <div className={s.form}>
      <form onSubmit={onParse} aria-label={M.modes.paste} className={s.form}>
        <TextArea label={M.paste} value={text} onChange={setText} placeholder={M.pastePlaceholder} maxLength={6000} autoResize maxHeight={320} />
        <span className={s.hint}>{M.pasteNote}</span>
        <Button type="submit" variant="secondary" disabled={!text.trim() || parse.isPending} loading={parse.isPending}>
          {M.pasteParse}
        </Button>
      </form>
      {parse.isError ? <span className={s.hint}>{labelOr(M.errorCode, errorCode, M.failed)}</span> : null}
      {parse.data && rows.length === 0 && !record.isSuccess ? <span className={s.hint}>{M.pasteNone}</span> : null}
      {rows.length > 0 ? (
        <>
          <span className={s.hint}>{M.pasteCandidates(rows.length)}</span>
          {skipped.length > 0 ? <span className={s.hint}>{M.pasteSkipped(count(skipped, "cancelled"), count(skipped, "no_amount"))}</span> : null}
          <ul className={s.candidates} aria-label={M.include}>
            {rows.map((row, index) => (
              <li key={index} className={s.candidate}>
                <div className={s.candidateHead}>
                  <Checkbox
                    checked={row.include}
                    onChange={(include) => update(index, { include })}
                    label={`${row.candidate.merchant ?? "—"} · ${formatDay(row.candidate.spentOn)}${row.candidate.installmentMonths ? ` · ${row.candidate.installmentMonths}개월` : ""}`}
                  />
                  <span className={s.value}>{formatWon(row.candidate.amount)}</span>
                </div>
                {row.include ? <CategoryChips value={row.category} onChange={(category) => update(index, { category })} /> : null}
              </li>
            ))}
          </ul>
          <span className={s.hint} role="status">
            {record.isError ? labelOr(M.errorCode, errorCode, M.failed) : !ready && chosen.length > 0 ? M.pickCategory : ""}
          </span>
          <Button onClick={onSave} disabled={!ready || record.isPending} loading={record.isPending}>
            {M.pasteSave(chosen.length)}
          </Button>
        </>
      ) : null}
      {record.data && record.isSuccess ? <SaveResult result={record.data} /> : null}
    </div>
  );
};
