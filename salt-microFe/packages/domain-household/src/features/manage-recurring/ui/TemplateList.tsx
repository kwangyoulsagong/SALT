"use client";

import { useState } from "react";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { CATEGORY_LABEL, formatMonth, formatWon, useRecurringTemplates, type RecurringTemplate } from "@/entities/household";

import { useEndTemplate } from "../api";
import { RECURRING_MESSAGES as M } from "../model";
import { TemplateEditor } from "./TemplateEditor";
import * as s from "./recurring.css";

/** 템플릿 목록 + 만들기 · 고치기 · 그만 적기(`FE-REQ-057` FR-4). 상한은 서버 값(`limit`) — 넘으면 서버가 거절한다 */
export const TemplateList = () => {
  const list = useRecurringTemplates();
  const end = useEndTemplate();
  const [editing, setEditing] = useState<RecurringTemplate | "new" | null>(null);

  if (list.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (list.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!list.data) return <Skeleton height={240} />;
  const { templates, limit } = list.data;

  return (
    <div className={s.form}>
      {editing === null ? (
        <div className={s.actions}>
          <Button size="sm" onClick={() => setEditing("new")} disabled={templates.length >= limit}>
            {M.add}
          </Button>
          <span className={s.note}>{M.limit(limit)}</span>
        </div>
      ) : (
        <TemplateEditor key={editing === "new" ? "new" : editing.id} template={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
      )}
      {templates.length === 0 ? (
        <EmptyState title={M.empty} />
      ) : (
        <ul className={s.list}>
          {templates.map((t) => (
            <li key={t.id} className={s.row}>
              <span className={s.rowMain}>
                <span className={s.line}>
                  {t.name} · {formatWon(t.amount)}
                </span>
                <span className={s.label}>
                  {M.dayOf(t.dayOfMonth)} · {CATEGORY_LABEL[t.category]}
                  {t.thisMonth ? ` · ${M.stage[t.thisMonth.stage]}` : ` · ${M.startsNext(formatMonth(t.startsMonth))}`}
                </span>
              </span>
              <span className={s.actions}>
                {t.confirmRequired ? null : <Badge>{M.autoBadge}</Badge>}
                <Button size="xs" variant="weak" onClick={() => setEditing(t)}>
                  {M.edit}
                </Button>
                <Button size="xs" variant="weak" disabled={end.isPending} onClick={() => end.mutate(t.id)}>
                  {M.end}
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {end.isError ? (
        <p className={s.note} role="status">
          {M.endFailed}
        </p>
      ) : null}
    </div>
  );
};
