"use client";

import { EmptyState } from "@repo/ui/emptyState";
import { Skeleton } from "@repo/ui/skeleton";

import { useChallenges } from "@/entities/household";
import { START_CHALLENGE_MESSAGES, StartChallengeForm } from "@/features/start-challenge";
import { ChallengeCard } from "@/features/track-challenge";

import { CHALLENGES_PAGE as M } from "../model";
import * as s from "./challenges.css";

/**
 * 챌린지 잎(`FE-REQ-057` FR-9 · 가계부 S1d) — 고르기 + 진행 · 시작 전 카드 + 끝난 카드. 순서 · 상한 · 단계는 서버 값.
 * 끝난 카드는 아래 묶음으로만 나눈다(같은 모양 · 같은 색 — 끝 ≠ 실패).
 */
export const ChallengeBoard = () => {
  const list = useChallenges();
  if (list.isSignedOut) return <EmptyState title={M.signedOut} />;
  if (list.isError) return <EmptyState title={M.loadFailed} tone="error" />;
  if (!list.data) return <Skeleton height={320} />;
  const data = list.data;
  const open = data.items.filter((c) => c.phase !== "ended");
  const ended = data.items.filter((c) => c.phase === "ended");
  return (
    <>
      {data.canStart ? <StartChallengeForm list={data} /> : <p className={s.note}>{START_CHALLENGE_MESSAGES.limit(data.limit)}</p>}
      {data.items.length === 0 ? <EmptyState title={M.empty} /> : null}
      {open.length > 0 ? (
        <ul className={s.list}>
          {open.map((c) => (
            <li key={c.id}>
              <ChallengeCard challenge={c} today={data.today} goals={data.goals} />
            </li>
          ))}
        </ul>
      ) : null}
      {ended.length > 0 ? (
        <section aria-label={M.ended}>
          <h2 className={s.sectionTitle}>{M.ended}</h2>
          <ul className={s.list}>
            {ended.map((c) => (
              <li key={c.id}>
                <ChallengeCard challenge={c} today={data.today} goals={data.goals} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
};
