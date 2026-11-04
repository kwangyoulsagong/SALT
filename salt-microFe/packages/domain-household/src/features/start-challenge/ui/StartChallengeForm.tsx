"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { Chip } from "@repo/ui/chip";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";

import { CHALLENGE_MESSAGES as C, type ChallengeList } from "@/entities/household";

import { useStartChallenge } from "../api";
import { START_CHALLENGE_MESSAGES as M } from "../model";
import * as s from "./start.css";

/**
 * 챌린지 고르기(`FE-REQ-057` FR-9 · 가계부 S1d). 예시를 누르면 이름 칸에 그 이름 — 고쳐도 된다. 기간은 날짜 칸 둘.
 * 날짜 범위(오늘 · 시작 최댓값)는 서버 값 — 화면은 날짜를 더하지 않는다. 기간 상한 · 앞뒤는 서버가 거절하고 화면은 그 코드를 한 줄로.
 * 저장 실패 시 입력값을 둔다(FR-10).
 */
export const StartChallengeForm = ({ list }: { list: ChallengeList }) => {
  const start = useStartChallenge();
  const [title, setTitle] = useState("");
  const [startsOn, setStartsOn] = useState(list.today);
  const [endsOn, setEndsOn] = useState("");
  const ready = title.trim() !== "" && startsOn !== "" && endsOn !== "";
  const code = isApiError(start.error) ? start.error.code : null;
  const failure =
    code === "CHALLENGE_PERIOD_TOO_LONG"
      ? M.periodTooLong(list.periodDaysMax)
      : code === "CHALLENGE_PERIOD_INVALID"
        ? M.periodInvalid
        : code === "CHALLENGE_LIMIT_REACHED"
          ? M.limitReached
          : start.isError
            ? M.failed
            : "";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    start.mutate(
      { title: title.trim(), startsOn, endsOn },
      {
        onSuccess: () => {
          setTitle("");
          setEndsOn("");
        },
      },
    );
  };

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <h2 className={s.title}>{M.title}</h2>
      <div className={s.chips} role="group" aria-label={M.presets}>
        {list.presets.map((key) => (
          <Chip key={key} size="sm" selected={title === C.presets[key]} onPress={() => setTitle(C.presets[key])}>
            {C.presets[key]}
          </Chip>
        ))}
      </div>
      <TextField label={M.name} value={title} onChange={setTitle} placeholder={M.namePlaceholder} maxLength={40} />
      <div className={s.period}>
        <TextField label={M.startsOn} type="date" value={startsOn} onChange={setStartsOn} min={list.today} max={list.startMax} />
        <TextField label={M.endsOn} type="date" value={endsOn} onChange={setEndsOn} min={startsOn || list.today} />
      </div>
      <p className={s.note}>{M.periodHint(list.periodDaysMax)}</p>
      <span className={s.note} role="status">
        {failure}
      </span>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={!ready || start.isPending} loading={start.isPending}>
          {M.submit}
        </Button>
      </div>
    </form>
  );
};
