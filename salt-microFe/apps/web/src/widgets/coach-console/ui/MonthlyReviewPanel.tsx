"use client";

import { Text } from "@repo/ui/text";
import { StatusLine } from "@repo/ui/statusLine";
import { useId, useState } from "react";

import {
  CoachBlockSkeleton,
  CoachDisclosure,
  formatGeneratedAt,
  MonthlyReviewCard,
  REVIEW_MESSAGES,
  useMonthlyReview,
} from "@/entities/coach";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { monthSelect } from "./CoachReport.css";

const R = REVIEW_MESSAGES;

const monthLabel = (month: string) => R.month(month.slice(0, 4), month.slice(5, 7));

/**
 * 월간 복기 (F009 시나리오 6 · FR-28 · `FE-REQ-039` FR-21). 코치 리포트 안 섹션 하나 — 새 화면 0개.
 *
 * 리포트 · 게이지 · 미러와 따로 부르고 따로 실패한다. 처음엔 서버가 고른 지난달(KST)이고, 저장된 달이 둘 이상이면
 * 고를 수 있다 — 고른 달은 이 화면의 상태일 뿐 저장하지 않는다.
 */
export const MonthlyReviewPanel = () => {
  const [month, setMonth] = useState<string | null>(null);
  const review = useMonthlyReview(month);
  const selectId = useId();

  const body = () => {
    if (review.isSignedOut) return <Text color="tertiary">{R.signedOut}</Text>;
    if (review.isPending) return <CoachBlockSkeleton block="zone" />;
    if (review.isError || review.data.status === "unavailable") return <StatusLine kind="error">{R.unavailable}</StatusLine>;

    const view = review.data;
    if (view.reviewStatus !== "ok" || !view.review) {
      return <Text color="tertiary">{R.status[view.reviewStatus === "ok" ? "no_ledger" : view.reviewStatus]}</Text>;
    }
    const generatedAt = view.review.generatedAt ? formatGeneratedAt(view.review.generatedAt) : null;
    return (
      <>
        <MonthlyReviewCard review={view.review} />
        {generatedAt && <p className={panelDescription}>{R.generatedAt(generatedAt)}</p>}
      </>
    );
  };

  const view = review.data?.status === "ok" ? review.data : null;
  const months = view ? [...new Set([view.month, ...view.availableMonths])].sort().reverse() : [];

  return (
    <section className={panel} aria-busy={review.isFetching}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{view ? `${R.heading} · ${monthLabel(view.month)}` : R.heading}</h2>
        {months.length > 1 && view && (
          <select
              id={selectId}
              className={monthSelect}
              aria-label={R.monthSelect}
              value={view.month}
              onChange={(event) => setMonth(event.target.value)}
            >
              {months.map((item) => (
                <option key={item} value={item}>
                  {monthLabel(item)}
                </option>
              ))}
          </select>
        )}
      </div>
      <p className={panelDescription}>{R.description}</p>
      {body()}
      <CoachDisclosure />
    </section>
  );
};
