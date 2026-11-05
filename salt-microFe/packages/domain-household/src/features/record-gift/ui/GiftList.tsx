"use client";

import { useState } from "react";

import { Button } from "@repo/ui/button";

import { PEOPLE_MESSAGES as P, formatFullDay, formatWon, occasionLabel, type PersonEntry } from "@/entities/household";

import { useDeleteGift } from "../api";
import { RECORD_GIFT_MESSAGES as M } from "../model";
import { GiftForm } from "./GiftForm";
import * as s from "./gift.css";

/** 주고받은 줄 목록 — 순서는 서버(최신순). 한 줄을 고치면 그 자리에 칸이 열린다. 지우기는 확인 창 없이(다시 적으면 된다) */
export const GiftList = ({ entries, occasions, today }: { entries: PersonEntry[]; occasions: string[]; today: string }) => {
  const [editing, setEditing] = useState<string | null>(null);
  const remove = useDeleteGift();
  if (entries.length === 0) return <p className={s.note}>{M.empty}</p>;
  return (
    <>
      <span className={s.note} role="status">
        {remove.isError ? M.deleteFailed : ""}
      </span>
      <ul className={s.list}>
        {entries.map((e) =>
          editing === e.id ? (
            <li key={e.id}>
              <GiftForm occasions={occasions} today={today} entry={e} onDone={() => setEditing(null)} />
            </li>
          ) : (
            <li key={e.id} className={s.item}>
              <span className={s.itemMain}>
                <span className={s.itemTitle}>{e.person}</span>
                <span className={s.label}>
                  {M.line(occasionLabel(e.occasion), formatFullDay(e.happenedOn))}
                  {e.memo ? ` · ${e.memo}` : ""}
                </span>
              </span>
              <span className={s.itemSide}>
                <span className={s.itemMain}>
                  <span className={s.label}>{P.direction[e.direction]}</span>
                  <span className={s.value}>{formatWon(e.amount)}</span>
                </span>
                <Button size="sm" variant="weak" onClick={() => setEditing(e.id)}>
                  {M.edit}
                </Button>
                <Button size="sm" variant="weak" onClick={() => remove.mutate(e.id)} disabled={remove.isPending}>
                  {M.delete}
                </Button>
              </span>
            </li>
          ),
        )}
      </ul>
    </>
  );
};
