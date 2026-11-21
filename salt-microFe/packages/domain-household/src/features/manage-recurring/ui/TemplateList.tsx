"use client";

import { useState } from "react";

import { Badge } from "@repo/ui/badge";
import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { card, toolAside, toolCard, toolEmpty, toolEmptyBody, toolEmptyTitle, toolGrid, toolMain } from "@repo/web-shared/ui/surface.css";

import { CategoryIcon, formatMonth, formatWon, useCategoryLabel, useRecurringTemplates, type RecurringTemplate } from "@/entities/household";

import { useEndTemplate } from "../api";
import { RECURRING_MESSAGES as M } from "../model";
import { TemplateEditor } from "./TemplateEditor";
import * as s from "./recurring.css";

/** 템플릿 목록 + 만들기 · 고치기 · 그만 적기(`FE-REQ-057` FR-4). 상한은 서버 값(`limit`) — 넘으면 서버가 거절한다 */
export const TemplateList = () => {
  const list = useRecurringTemplates();
  const end = useEndTemplate();
  const label = useCategoryLabel();
  const [editing, setEditing] = useState<RecurringTemplate | "new" | null>(null);

  if (list.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (list.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!list.data) return <Skeleton height={240} />;
  const { templates, limit } = list.data;

  // 2단(2026-11-20) — 목록 | 적기 · 고치기 카드. 비면 안내 상자(무엇이 생기는지)
  return (
    <div className={toolGrid}>
      <aside className={`${toolAside} ${toolCard}`}>
        {editing === null ? (
          <>
            <h2 className={s.asideTitle}>{M.addTitle}</h2>
            <div className={s.actions}>
              <Button size="sm" onClick={() => setEditing("new")} disabled={templates.length >= limit}>
                {M.add}
              </Button>
              <span className={s.note}>{M.limit(limit)}</span>
            </div>
          </>
        ) : (
          <TemplateEditor key={editing === "new" ? "new" : editing.id} template={editing === "new" ? null : editing} onDone={() => setEditing(null)} />
        )}
      </aside>
      <div className={toolMain}>
        {templates.length === 0 ? (
          <div className={toolEmpty}>
            <p className={toolEmptyTitle}>{M.empty}</p>
            <p className={toolEmptyBody}>{M.emptyHint}</p>
          </div>
        ) : (
          <div className={card}>
            <ul className={s.list}>
              {templates.map((t) => (
                <li key={t.id} className={s.row}>
                  <span className={s.iconPlate} aria-hidden="true">
                    <CategoryIcon category={t.category} />
                  </span>
                  <span className={s.rowMain}>
                    <span className={s.line}>
                      {t.name} · {formatWon(t.amount)}
                    </span>
                    <span className={s.label}>
                      {M.dayOf(t.dayOfMonth)} · {label.category(t.category)}
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
          </div>
        )}
        {end.isError ? (
          <p className={s.note} role="status">
            {M.endFailed}
          </p>
        ) : null}
      </div>
    </div>
  );
};
