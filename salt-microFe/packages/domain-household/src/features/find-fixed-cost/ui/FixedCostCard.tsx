"use client";

import Link from "next/link";
import { useState } from "react";

import { Button } from "@repo/ui/button";

import { isApiError } from "@repo/web-shared/api";

import { FIXED_COST_MESSAGES as M, FixedCostHead, type HouseholdFixedCost } from "@/entities/household";

import { useHideFixedCost, useTemplateFromFixedCost } from "../api";
import { FIND_FIXED_COST_MESSAGES as A } from "../model";
import * as s from "./fixedCost.css";

type Done = { kind: "hidden" | "templated"; cost: HouseholdFixedCost };

/**
 * 고정비 후보 카드(가계부 S1e `FE-REQ-057` FR-11). 무엇이 후보인지 · 올랐는지는 서버가 정한다 — 화면은 두 동작만:
 * 매달 적기로(반복 템플릿 — 칸은 서버 값 그대로) · 아니에요(숨기기, 바로 되돌리기 한 번). 결과 문장은 행이 사라져도 카드에 남는다.
 * 새 동작을 시작하면 지난 결과 · 실패 줄을 지운다(S1d 확인 단계 결함과 같은 규칙)
 */
export const FixedCostCard = ({ costs }: { costs: HouseholdFixedCost[] }) => {
  const hide = useHideFixedCost();
  const template = useTemplateFromFixedCost();
  const [done, setDone] = useState<Done | null>(null);
  if (costs.length === 0 && !done) return null;
  const busy = hide.isPending || template.isPending;
  const failed = hide.error ?? template.error;
  const start = () => {
    setDone(null);
    hide.reset();
    template.reset();
  };

  return (
    <section className={s.card} aria-label={M.title}>
      <h2 className={s.title}>{M.title}</h2>
      {costs.length > 0 ? <p className={s.description}>{M.description}</p> : null}
      <ul className={s.list}>
        {costs.map((c) => (
          <li key={c.key} className={s.item}>
            <FixedCostHead cost={c} />
            <div className={s.actions}>
              <Button
                size="sm"
                variant="weak"
                aria-label={A.toTemplateLabel(c.merchant)}
                disabled={busy}
                loading={template.isPending && template.variables?.key === c.key}
                onClick={() => {
                  start();
                  template.mutate(c, { onSuccess: () => setDone({ kind: "templated", cost: c }) });
                }}
              >
                {A.toTemplate}
              </Button>
              <Button
                size="sm"
                variant="weak"
                aria-label={A.hideLabel(c.merchant)}
                disabled={busy}
                onClick={() => {
                  start();
                  hide.mutate({ key: c.key, hide: true }, { onSuccess: () => setDone({ kind: "hidden", cost: c }) });
                }}
              >
                {A.hide}
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <p className={s.note} role="status">
        {failed ? (
          isApiError(failed) && failed.code === "TEMPLATE_TOO_MANY" ? A.templateLimit : A.failed
        ) : done?.kind === "hidden" ? (
          <>
            {A.hidden(done.cost.merchant)}
            <Button
              size="sm"
              variant="weak"
              disabled={busy}
              onClick={() => {
                const cost = done.cost;
                start();
                hide.mutate({ key: cost.key, hide: false });
              }}
            >
              {A.undo}
            </Button>
          </>
        ) : done?.kind === "templated" ? (
          <>
            {A.templated(done.cost.merchant)}
            <Link href="/household/templates">{A.templates}</Link>
          </>
        ) : null}
      </p>
    </section>
  );
};
