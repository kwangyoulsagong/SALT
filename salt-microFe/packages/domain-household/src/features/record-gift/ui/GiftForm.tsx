"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { Chip } from "@repo/ui/chip";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { PEOPLE_MESSAGES as P, occasionLabel, type GiftDirection, type PersonEntry, type PersonEntryRequest } from "@/entities/household";

import { useAddGift, useEditGift } from "../api";
import { RECORD_GIFT_MESSAGES as M } from "../model";
import * as s from "./gift.css";

const DIRECTIONS: GiftDirection[] = ["gave", "received"];

/**
 * 주고받은 돈 적기 · 고치기(가계부 S1h). 어떤 일 목록 · 오늘은 서버 값. 이름 정리 · 날 범위 검사는 서버가 하고 화면은 코드를 한 줄로.
 * 저장 실패 시 입력값을 둔다(FR-10). 이름을 고르면(사람 목록에서) 그 이름이 칸에 들어온다 — [person] 으로 받는다.
 */
export const GiftForm = ({
  occasions,
  today,
  entry,
  person,
  onDone,
}: {
  occasions: string[];
  today: string;
  entry?: PersonEntry;
  person?: string | null;
  onDone?: () => void;
}) => {
  const add = useAddGift();
  const edit = useEditGift();
  const save = entry ? edit : add;
  const [name, setName] = useState(entry?.person ?? person ?? "");
  const [direction, setDirection] = useState<GiftDirection>(entry?.direction ?? "gave");
  const [occasion, setOccasion] = useState(entry?.occasion ?? occasions[0] ?? "other");
  const [day, setDay] = useState(entry?.happenedOn ?? today);
  const [memo, setMemo] = useState(entry?.memo ?? "");
  const nums = useNumberFields({ amount: "won" }, entry ? { amount: String(entry.amount) } : {});
  const amount = parseAmountInput(nums.value("amount"));
  const ready = name.trim() !== "" && amount !== null && day !== "";
  const code = isApiError(save.error) ? save.error.code : null;
  const failure = code ? (M.errors[code] ?? M.failed) : save.isError ? M.failed : "";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    const body: PersonEntryRequest = { person: name.trim(), direction, amount, occasion, happenedOn: day, ...(memo.trim() ? { memo: memo.trim() } : {}) };
    const done = {
      onSuccess: () => {
        if (!entry) {
          nums.reset();
          setMemo("");
        }
        onDone?.();
      },
    };
    if (entry) edit.mutate({ id: entry.id, body }, done);
    else add.mutate(body, done);
  };

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={entry ? M.editTitle : M.addTitle}>
      <h2 className={s.title}>{entry ? M.editTitle : M.addTitle}</h2>
      <SegmentedControl label={M.direction} value={direction} onChange={setDirection} options={DIRECTIONS.map((d) => ({ value: d, label: P.direction[d] }))} />
      <div className={s.fields}>
        <TextField label={M.person} value={name} onChange={setName} placeholder={M.personPlaceholder} maxLength={20} />
        <TextField label={M.amount} value={nums.value("amount")} onChange={(v) => nums.change("amount", v)} inputMode="numeric" error={nums.message("amount")} />
      </div>
      <div className={s.chips} role="group" aria-label={M.occasion}>
        {occasions.map((key) => (
          <Chip key={key} size="sm" selected={occasion === key} onPress={() => setOccasion(key)}>
            {occasionLabel(key)}
          </Chip>
        ))}
      </div>
      <div className={s.fields}>
        <TextField label={M.happenedOn} type="date" value={day} onChange={setDay} min="2000-01-01" max={today} />
        <TextField label={M.memo} value={memo} onChange={setMemo} maxLength={100} />
      </div>
      <p className={s.note}>{M.privacy}</p>
      <span className={s.note} role="status">
        {failure}
      </span>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={!ready || save.isPending} loading={save.isPending}>
          {entry ? M.save : M.submit}
        </Button>
        {onDone ? (
          <Button type="button" size="sm" variant="weak" onClick={onDone}>
            {M.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
};
