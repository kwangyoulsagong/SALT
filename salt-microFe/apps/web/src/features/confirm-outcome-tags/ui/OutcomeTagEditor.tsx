"use client";

import { KNOWN_MISTAKE_TAGS, type DecisionOutcomeView } from "@repo/core/coach";
import { StatusLine } from "@repo/ui/statusLine";
import { useId, useState, type FormEvent } from "react";

import { effectiveOutcomeTags, OutcomeTagChips, tagName } from "@/entities/coach";

import { useConfirmOutcomeTags } from "../api";
import { CONFIRM_OUTCOME_TAGS_MESSAGES as MSG } from "../model";
import {
  actions,
  checkbox,
  editor,
  fieldset,
  legend,
  option,
  options,
  row,
  weakButton,
} from "./OutcomeTagEditor.css";

const HTTP_UNAUTHORIZED = 401;

/**
 * 청산 한 건의 실수 태그 확정 (F009 FR-18 · `FE-REQ-039` FR-17).
 *
 * 서버가 붙인 태그는 **후보**다. 여기서 고르면 확정되고, 미러의 태그 손익 · 엣지 배지가 확정 태그로 다시 세진다.
 * 모달 · 확인 단계 없이 그 줄에서 펼친다. 아무것도 고르지 않고 확정하면 "실수 없음"이다.
 * 사용자 정의 태그는 이미 붙은 것만 보이고 끌 수 있다 — 새로 적는 칸은 없다(`FE-REQ-039` 미검증 표).
 */
export const OutcomeTagEditor = ({ outcome }: { outcome: DecisionOutcomeView }) => {
  const legendId = useId();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const confirm = useConfirmOutcomeTags();

  const current = effectiveOutcomeTags(outcome);
  const choices = [...KNOWN_MISTAKE_TAGS, ...current.filter((tag) => !(KNOWN_MISTAKE_TAGS as readonly string[]).includes(tag))];

  const start = () => {
    setSelected(current);
    setMessage(null);
    setOpen(true);
  };

  const toggle = (tag: string) =>
    setSelected((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    confirm.mutate(
      { id: outcome.id, tags: choices.filter((tag) => selected.includes(tag)) },
      {
        onSuccess: () => {
          setOpen(false);
          setMessage(MSG.saved);
        },
        onError: (error) => setMessage(error.status === HTTP_UNAUTHORIZED ? MSG.signedOut : MSG.failed),
      },
    );
  };

  if (!open) {
    return (
      <div className={row}>
        <OutcomeTagChips outcome={outcome} />
        <button type="button" className={weakButton} onClick={start} aria-label={MSG.editLabel(outcome.symbol)}>
          {MSG.edit}
        </button>
        {message && (
          <StatusLine kind={message === MSG.saved ? "success" : "error"} live>
            {message}
          </StatusLine>
        )}
      </div>
    );
  }

  return (
    <form className={editor} onSubmit={onSubmit}>
      <fieldset className={fieldset} aria-labelledby={legendId}>
        <legend id={legendId} className={legend}>
          {MSG.legend}
        </legend>
        <div className={options}>
          {choices.map((tag) => (
            <label key={tag} className={option}>
              <input
                type="checkbox"
                className={checkbox}
                checked={selected.includes(tag)}
                onChange={() => toggle(tag)}
              />
              {tagName(tag)}
            </label>
          ))}
        </div>
      </fieldset>
      <div className={actions}>
        <button type="submit" className={weakButton} disabled={confirm.isPending}>
          {confirm.isPending ? MSG.confirming : MSG.confirm}
        </button>
        <button type="button" className={weakButton} onClick={() => setOpen(false)} disabled={confirm.isPending}>
          {MSG.cancel}
        </button>
      </div>
      {message && (
        <StatusLine kind={message === MSG.saved ? "success" : "error"} live>
          {message}
        </StatusLine>
      )}
    </form>
  );
};
