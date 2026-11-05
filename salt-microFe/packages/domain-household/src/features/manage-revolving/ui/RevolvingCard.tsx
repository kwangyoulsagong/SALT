"use client";

import { useState } from "react";

import { Button } from "@repo/ui/button";

import { REVOLVING_MESSAGES as R, formatMonth, formatRate, formatWon, revolvingName, type RevolvingList, type RevolvingProjection } from "@/entities/household";

import { useEndRevolving } from "../api";
import { MANAGE_REVOLVING_MESSAGES as M } from "../model";
import { RevolvingForm } from "./RevolvingForm";
import * as s from "./revolving.css";

/**
 * 명세서 한 장 — 앞으로 6개월 추정 표(원금 몫 · 수수료 · 청구 · 그 뒤 잔액) · 수수료 합 · 남는 잔액. 숫자는 전부 서버 값.
 * 가정 문장을 늘 함께 둔다. "새 명세서"로 고치고 "다 갚았어요 · 해지했어요"로 끝낸다(확인 창 0 — 다시 적으면 된다).
 */
export const RevolvingCard = ({ projection, list }: { projection: RevolvingProjection; list: RevolvingList }) => {
  const [editing, setEditing] = useState(false);
  const end = useEndRevolving();
  const p = projection.plan;
  const last = projection.charges.at(-1);
  if (editing) return <RevolvingForm list={list} plan={p} onDone={() => setEditing(false)} />;
  return (
    <section className={s.card} aria-label={revolvingName(p)}>
      <div className={s.head}>
        <h2 className={s.title}>{revolvingName(p)}</h2>
        <span className={s.label}>
          {M.statement(formatMonth(p.statementMonth))} · {formatWon(p.balance)}
        </span>
      </div>
      <span className={s.label}>{M.terms(p.payRatio, formatRate(p.annualRate))}</span>
      <table className={s.table}>
        <caption className={s.label}>{R.assumption[list.assumption] ?? R.note}</caption>
        <thead>
          <tr>
            <th className={s.th} scope="col">{M.colMonth}</th>
            <th className={s.th} scope="col">{M.colPrincipal}</th>
            <th className={s.th} scope="col">{M.colFee}</th>
            <th className={s.th} scope="col">{M.colTotal}</th>
            <th className={s.th} scope="col">{M.colBalance}</th>
          </tr>
        </thead>
        <tbody>
          {projection.charges.map((c) => (
            <tr key={c.month}>
              <td className={s.td}>{formatMonth(c.month)}</td>
              <td className={s.td}>{formatWon(c.principal)}</td>
              <td className={s.td}>{formatWon(c.fee)}</td>
              <td className={s.td}>{formatWon(c.total)}</td>
              <td className={s.td}>{formatWon(c.balanceAfter)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={s.note}>{M.feeTotal(projection.charges.length, formatWon(projection.feeTotal))}</p>
      {last ? (
        <p className={s.note}>
          {projection.balanceAtEnd === 0 ? M.paidOff(formatMonth(last.month)) : M.balanceAtEnd(formatMonth(last.month), formatWon(projection.balanceAtEnd))}
        </p>
      ) : null}
      <p className={s.note}>{R.note}</p>
      <span className={s.note} role="status">
        {end.isError ? M.endFailed : ""}
      </span>
      <div className={s.actions}>
        <Button size="sm" variant="weak" onClick={() => setEditing(true)}>
          {M.edit}
        </Button>
        <Button size="sm" variant="weak" onClick={() => end.mutate(p.id)} disabled={end.isPending} loading={end.isPending}>
          {M.end}
        </Button>
      </div>
    </section>
  );
};
