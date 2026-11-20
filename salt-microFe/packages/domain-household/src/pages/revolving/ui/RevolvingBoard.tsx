"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import {
  formatMonth,
  formatWon,
  revolvingName,
  useRevolving,
} from "@/entities/household";
import {
  MANAGE_REVOLVING_MESSAGES,
  RevolvingCard,
  RevolvingForm,
} from "@/features/manage-revolving";

import { REVOLVING_PAGE as M } from "../model";
import {
  toolAside,
  toolEmpty,
  toolEmptyBody,
  toolEmptyTitle,
  toolGrid,
  toolMain,
} from "@repo/web-shared/ui/surface.css";

import * as s from "./revolving.css";

/**
 * 리볼빙 잎(가계부 S1h) — 적기 칸 + 끝내지 않은 명세서(추정 표) + 끝낸 명세서. 상한 · 순서 · 추정은 서버 값.
 * 끝낸 명세서는 아래 묶음으로만(같은 색).
 */
export const RevolvingBoard = () => {
  const list = useRevolving();
  if (list.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (list.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!list.data) return <Skeleton height={320} />;
  const data = list.data;
  return (
    // 2단(2026-11-20) — 명세서 목록 | 적기 카드. 비면 안내 상자
    <div className={toolGrid}>
      <aside className={toolAside}>
        {data.canAdd ? (
          <RevolvingForm list={data} />
        ) : (
          <p className={s.note}>
            {MANAGE_REVOLVING_MESSAGES.limit(data.limit)}
          </p>
        )}
      </aside>
      <div className={toolMain}>
        {data.open.length === 0 ? (
          <div className={toolEmpty}>
            <p className={toolEmptyTitle}>{M.empty}</p>
            <p className={toolEmptyBody}>{M.emptyHint}</p>
          </div>
        ) : null}
        {data.open.length > 0 ? (
          <ul className={s.list}>
            {data.open.map((p) => (
              <li key={p.plan.id}>
                <RevolvingCard projection={p} list={data} />
              </li>
            ))}
          </ul>
        ) : null}
        {data.ended.length > 0 ? (
          <section aria-label={MANAGE_REVOLVING_MESSAGES.ended}>
            <h2 className={s.sectionTitle}>
              {MANAGE_REVOLVING_MESSAGES.ended}
            </h2>
            <ul className={s.list}>
              {data.ended.map((p) => (
                <li key={p.id} className={s.note}>
                  {revolvingName(p)} · {formatMonth(p.statementMonth)} ·{" "}
                  {formatWon(p.balance)} ·{" "}
                  {p.endedOn
                    ? MANAGE_REVOLVING_MESSAGES.endedOn(p.endedOn)
                    : ""}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
};
