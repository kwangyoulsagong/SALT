"use client";

import { Text } from "@repo/ui/text";
import { StatusLine } from "@repo/ui/statusLine";
import { useId, useState } from "react";

import {
  CoachBlockSkeleton,
  CoachDisclosure,
  formatGeneratedAt,
  KR_REVIEW_MESSAGES,
  MonthlyReviewCard,
  REVIEW_MESSAGES,
  useMonthlyReview,
} from "@/entities/coach";
import { panel, panelDescription, panelHead, panelTitle } from "@/shared/ui/surface.css";

import { monthSelect } from "./CoachReport.css";

const R = REVIEW_MESSAGES;
const KR = KR_REVIEW_MESSAGES;

const monthLabel = (month: string) => R.month(month.slice(0, 4), month.slice(5, 7));

/**
 * 월간 복기 (F009 시나리오 6 · FR-28 · `FE-REQ-039` FR-21). 코치 리포트 안 섹션 하나 — 새 화면 0개.
 *
 * 리포트 · 게이지 · 미러와 따로 부르고 따로 실패한다. 처음엔 서버가 고른 지난달(KST)이고, 저장된 달이 둘 이상이면
 * 고를 수 있다 — 고른 달은 이 화면의 상태일 뿐 저장하지 않는다.
 *
 * `kr_stock` 이면 국내판(F011 FR-48 · `FE-REQ-041` FR-30) — 코인판 바로 아래 섹션 하나. 소유자 전용이라 비소유자(404) ·
 * 로그아웃이면 **섹션 자체가 없다**(국내 미러와 같은 규칙).
 */
export const MonthlyReviewPanel = ({ assetType = "crypto" }: { assetType?: "crypto" | "kr_stock" }) => {
  const [month, setMonth] = useState<string | null>(null);
  const review = useMonthlyReview(month, assetType);
  const selectId = useId();
  const isKr = assetType === "kr_stock";
  if (isKr && (review.isSignedOut || review.notOwner)) return null;

  const heading = isKr ? KR.heading : R.heading;
  const body = () => {
    if (review.isSignedOut) return <Text color="tertiary">{R.signedOut}</Text>;
    if (review.isPending) return <CoachBlockSkeleton block="zone" />;
    if (review.isError || review.data.status === "unavailable") {
      return <StatusLine kind="error">{isKr ? KR.unavailable : R.unavailable}</StatusLine>;
    }

    const view = review.data;
    if (view.reviewStatus !== "ok" || !view.review) {
      const status = view.reviewStatus === "ok" ? "no_ledger" : view.reviewStatus;
      return <Text color="tertiary">{isKr && status === "no_ledger" ? KR.noLedger : R.status[status]}</Text>;
    }
    const generatedAt = view.review.generatedAt ? formatGeneratedAt(view.review.generatedAt) : null;
    return (
      <>
        <MonthlyReviewCard review={view.review} assetType={assetType} />
        {generatedAt && <p className={panelDescription}>{R.generatedAt(generatedAt)}</p>}
      </>
    );
  };

  const view = review.data?.status === "ok" ? review.data : null;
  const months = view ? [...new Set([view.month, ...view.availableMonths])].sort().reverse() : [];

  return (
    <section className={panel} aria-busy={review.isFetching}>
      <div className={panelHead}>
        <h2 className={panelTitle}>{view ? `${heading} · ${monthLabel(view.month)}` : heading}</h2>
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
      <p className={panelDescription}>{isKr ? KR.description : R.description}</p>
      {body()}
      <CoachDisclosure />
    </section>
  );
};
