"use client";

import { useRef, useState, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { StatusLine } from "@repo/ui/statusLine";
import { TextField } from "@repo/ui/textField";

import { PLAN_ERROR_CODE, PLAN_MESSAGES, won, type PlanSettingsVM } from "@/entities/plan";
import { parseAmountInput, useNumberFields } from "@repo/web-shared/lib";

import { useSavePlanSettings } from "../api";
import { PLAN_SETTINGS_MESSAGES as M } from "../model";
import { actions, form, list, note, title } from "./PlanSettingsForm.css";

/**
 * 월 적립액 한 칸(`FE-REQ-022` G절 · `FE-REQ-023` E절). 배분 · 밴드는 읽기 전용으로 보이고 입력 칸이 없다(D9).
 * 하한 · 상한 · 단위는 서버 설정 응답(`limits`)의 숫자로 쓴다 — 프론트에 금액 상수 0(FR-65). 422 를 받으면 그 숫자를 칸 아래에
 */
export const PlanSettingsForm = ({ settings }: { settings: PlanSettingsVM }) => {
  const save = useSavePlanSettings();
  const [wasConfigured] = useState(settings.configured);
  const nums = useNumberFields({ monthly: "won" }, settings.monthlyBaseKrw === null ? {} : { monthly: String(settings.monthlyBaseKrw) });
  const amount = parseAmountInput(nums.value("monthly"));
  const code = save.error?.code ?? null;
  // 겹쳐 누름 막기 — `isPending` 은 다음 렌더에야 참이다(완료 체크와 같은 이유 — 0ms 연속 submit)
  const sending = useRef(false);
  const limits = settings.limits;
  const fieldError =
    code === PLAN_ERROR_CODE.baseAmountInvalid ? M.invalid(won(limits.minKrw), won(limits.maxKrw), won(limits.unitKrw)) : nums.message("monthly");

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (amount === null || sending.current) return;
    sending.current = true;
    save.mutate({ monthlyBaseKrw: amount }, { onSettled: () => (sending.current = false) });
  };

  return (
    <form className={form} onSubmit={onSubmit} aria-labelledby="plan-settings">
      <h3 id="plan-settings" className={title}>
        {M.heading}
      </h3>
      {settings.currentMonthlyBaseKrw !== null ? <p className={note}>{M.current(won(settings.currentMonthlyBaseKrw))}</p> : null}
      {settings.pending ? <p className={note}>{M.pending(won(settings.pending.monthlyBaseKrw), settings.pending.effectiveWeek)}</p> : null}
      <TextField
        label={M.label}
        value={nums.value("monthly")}
        onChange={(v) => nums.change("monthly", v)}
        inputMode="numeric"
        error={fieldError}
      />
      <ul className={list}>
        {settings.allocation.map((a) => (
          <li key={a.asset}>{M.allocation(PLAN_MESSAGES.asset[a.asset], a.pct, a.weeklyBaseKrw === null ? null : won(a.weeklyBaseKrw))}</li>
        ))}
      </ul>
      <p className={note}>{M.allocationNote}</p>
      <div className={actions}>
        <Button type="submit" size="sm" variant={wasConfigured ? "weak" : "primary"} disabled={amount === null || save.isPending} loading={save.isPending}>
          {wasConfigured ? M.save : M.saveFirst}
        </Button>
      </div>
      <div role="status">
        {save.isError && code !== PLAN_ERROR_CODE.baseAmountInvalid ? (
          <StatusLine kind="error">{(code && M.failed[code]) || M.failedOther}</StatusLine>
        ) : null}
        {save.isSuccess ? <StatusLine kind="success">{wasConfigured ? M.savedNextWeek : M.savedFirst}</StatusLine> : null}
      </div>
    </form>
  );
};
