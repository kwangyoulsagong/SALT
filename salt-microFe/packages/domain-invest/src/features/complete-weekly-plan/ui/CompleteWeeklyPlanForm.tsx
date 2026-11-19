"use client";

import { useRef, type FormEvent } from "react";

import { Button } from "@repo/ui/button";
import { StatusLine } from "@repo/ui/statusLine";
import { TextField } from "@repo/ui/textField";

import { PLAN_MESSAGES, type CompleteWeeklyPlanInput, type WeeklyPlanVM } from "@/entities/plan";
import { useNumberFields } from "@repo/web-shared/lib";

import { useCompleteWeeklyPlan } from "../api";
import { COMPLETE_PLAN_MESSAGES as M } from "../model";
import { actions, fields, form, title, what } from "./CompleteWeeklyPlanForm.css";

/** 칸 글자 → 보낼 정수. 비면 `undefined`(서버가 계획액으로 적는다) — 반올림 · 합산하지 않는다 */
const toAmount = (text: string): number | undefined => {
  const cleaned = text.replace(/,/g, "").trim();
  if (cleaned === "") return undefined;
  const value = Number(cleaned);
  return Number.isSafeInteger(value) ? value : undefined;
};

/**
 * [이번 주 적립 완료](`FE-REQ-022` F절 · `FE-REQ-023` D절) — 자산마다 넣은 금액(기본 = 계획액 · 이미 적었으면 그 금액), 다시 보내면 고친다.
 * 원장 · 거래로 추정하지 않는다(`ADR-002`). 누르는 동안 버튼이 막혀 겹쳐 보내지 않는다(더블 탭 1회).
 * 칸 처음 값은 마운트 때 한 번 — 주 · 계획액이 바뀌면 부르는 쪽이 `key` 로 다시 세운다(주가 바뀌었다는 422 뒤 무효화도 같은 길)
 */
export const CompleteWeeklyPlanForm = ({ plan }: { plan: WeeklyPlanVM }) => {
  const complete = useCompleteWeeklyPlan();
  const initial = Object.fromEntries(
    plan.items.map((i) => [i.asset, String(i.status === "executed" ? (i.executedKrw ?? "") : (i.amountKrw ?? ""))]),
  );
  const nums = useNumberFields(Object.fromEntries(plan.items.map((i) => [i.asset, "won" as const])), initial);
  const allDone = plan.items.length > 0 && plan.items.every((i) => i.status === "executed");
  const code = complete.error?.code ?? null;
  // 겹쳐 누름 막기 — `isPending` 은 다음 렌더에야 참이라 0ms 연속 submit 은 둘 다 나간다(시험 도구 dblclick 실측 2026-11-19 · 사람 간격 10ms~ 는 1회)
  const sending = useRef(false);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (sending.current) return;
    sending.current = true;
    const input: CompleteWeeklyPlanInput = {
      weekOf: plan.weekOf,
      executions: plan.items.map((i) => {
        const amountKrw = toAmount(nums.value(i.asset));
        return amountKrw === undefined ? { asset: i.asset } : { asset: i.asset, amountKrw };
      }),
    };
    complete.mutate(input, { onSettled: () => (sending.current = false) });
  };

  return (
    <form className={form} onSubmit={onSubmit} aria-labelledby="complete-weekly-plan">
      <h3 id="complete-weekly-plan" className={title}>
        {M.heading}
      </h3>
      <p className={what}>{M.what}</p>
      <div className={fields}>
        {plan.items.map((i) => (
          <TextField
            key={i.asset}
            label={M.amountLabel(PLAN_MESSAGES.asset[i.asset])}
            value={nums.value(i.asset)}
            onChange={(v) => nums.change(i.asset, v)}
            inputMode="numeric"
            error={nums.message(i.asset)}
          />
        ))}
      </div>
      <div className={actions}>
        <Button type="submit" size="sm" disabled={complete.isPending} loading={complete.isPending}>
          {allDone ? M.update : M.submit}
        </Button>
      </div>
      <div role="status">
        {complete.isError ? <StatusLine kind="error">{(code && M.failed[code]) || M.failedOther}</StatusLine> : null}
        {complete.isSuccess && !complete.isPending ? <StatusLine kind="success">{M.done}</StatusLine> : null}
      </div>
    </form>
  );
};
