"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { Checkbox } from "@repo/ui/checkbox";
import { SegmentedControl } from "@repo/ui/segmentedControl";
import { TextField } from "@repo/ui/textField";

import { isApiError } from "@repo/web-shared/api";
import { labelOr, parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { formatWon, type WageBasisKey, type WorkHoursSetting } from "@/entities/household";

import { useSetWorkHours } from "../api";
import { WORK_SETTING_MESSAGES as M } from "../model";
import * as s from "./work.css";

const BASES: WageBasisKey[] = ["hourly", "monthly"];

/**
 * 근무 시간으로 보기(`FE-REQ-057` FR-8 · `SRV-REQ-046` FR-15). 끄고 켠다 — 나누기(월급 ÷ 시간 · 금액 ÷ 시급)는 서버가 한다.
 * 저장 실패 시 입력값을 둔다(FR-10).
 */
export const WorkHoursEditor = ({ setting }: { setting: WorkHoursSetting }) => {
  const save = useSetWorkHours();
  const [on, setOn] = useState(setting.on);
  const [basis, setBasis] = useState<WageBasisKey>(setting.basis ?? "hourly");
  const nums = useNumberFields(
    { amount: "won", monthlyHours: "count" },
    {
      ...(setting.amount !== null ? { amount: String(setting.amount) } : {}),
      ...(setting.monthlyHours !== null ? { monthlyHours: String(setting.monthlyHours) } : {}),
    },
  );
  const amount = parseAmountInput(nums.value("amount"));
  const hours = parseAmountInput(nums.value("monthlyHours"));
  const ready = !on || (amount !== null && amount > 0);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    save.mutate({
      on,
      ...(amount !== null && amount > 0 ? { basis, amount } : {}),
      ...(basis === "monthly" && amount !== null && hours !== null && hours > 0 ? { monthlyHours: hours } : {}),
    });
  };

  const current = save.data ?? setting;
  const code = isApiError(save.error) ? save.error.code : null;

  return (
    <form className={s.form} onSubmit={onSubmit} aria-label={M.title}>
      <h2 className={s.title}>{M.title}</h2>
      <p className={s.note}>{M.description}</p>
      <Checkbox checked={on} onChange={setOn} label={M.on} />
      <SegmentedControl label={M.basis} value={basis} onChange={setBasis} options={BASES.map((b) => ({ value: b, label: M.bases[b] }))} />
      <TextField label={M.amount[basis]} value={nums.value("amount")} onChange={(v) => nums.change("amount", v)} inputMode="numeric" error={nums.message("amount")} />
      {basis === "monthly" ? (
        <TextField
          label={M.monthlyHours}
          value={nums.value("monthlyHours")}
          onChange={(v) => nums.change("monthlyHours", v)}
          inputMode="numeric"
          helperText={M.monthlyHoursHint(setting.defaultMonthlyHours)}
          error={nums.message("monthlyHours")}
        />
      ) : null}
      <span className={s.note} role="status">
        {save.isError
          ? labelOr(M.errorCode, code, M.failed)
          : save.isSuccess
            ? current.hourly !== null
              ? `${M.saved} · ${M.hourly(formatWon(current.hourly))}`
              : `${M.saved} · ${M.offKept}`
            : current.hourly !== null
              ? M.hourly(formatWon(current.hourly))
              : ""}
      </span>
      <div className={s.actions}>
        <Button type="submit" size="sm" disabled={!ready || save.isPending} loading={save.isPending}>
          {M.submit}
        </Button>
      </div>
    </form>
  );
};
