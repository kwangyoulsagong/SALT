"use client";

// 클라이언트 잎: 포지션 · 매입가 숨김을 브라우저에서 읽는다(`PositionOverview` 와 같은 이유).
import Link from "next/link";

import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";

import { ROUTES } from "@repo/web-shared/config";
import { NavChevron } from "@repo/web-shared/ui";

import { usePurchasePriceVisibility } from "@/entities/coach";
import { POSITION_MESSAGES, PositionHero, usePositionOverview } from "@/entities/portfolio";

import { POSITION_SUMMARY_MESSAGES } from "../model/messages";
import { detailLink, summary } from "./PositionSummary.css";

/**
 * 포지션 요약(F006 A절 · `FE-REQ-030` FR-51 — PC 코치 격자 오른쪽 아래 칸). `/portfolio` 맨 위 Hero 와 **같은 응답 · 같은 컴포넌트** —
 * 흐름 · 레이더 · 보유는 포트폴리오에서(같은 숫자를 칸마다 다시 만들지 않는다). 칸 머리말이 제목이라 여기엔 제목을 두지 않는다.
 */
export const PositionSummary = () => {
  const overview = usePositionOverview();
  const purchasePrice = usePurchasePriceVisibility();

  const link = (
    <Link href={ROUTES.portfolio} className={detailLink}>
      {POSITION_SUMMARY_MESSAGES.detailLink}
      <NavChevron />
    </Link>
  );

  if (overview.isSignedOut) return null; // 페이지가 유리막을 그린다
  if (overview.isPending) {
    return (
      <div className={summary} aria-busy="true">
        <Text color="tertiary">{POSITION_MESSAGES.loading}</Text>
      </div>
    );
  }
  if (overview.isError) {
    return (
      <div className={summary}>
        <StatusLine kind="error">{POSITION_MESSAGES.loadFailed}</StatusLine>
      </div>
    );
  }
  const data = overview.data;
  if (data.empty || !data.hero) {
    return (
      <div className={summary}>
        <Text color="secondary">{POSITION_MESSAGES.emptyTitle}</Text>
        {link}
      </div>
    );
  }
  return (
    <div className={summary}>
      <PositionHero hero={data.hero} purchasePrice={purchasePrice} />
      {data.degradedReasons
        .map((code) => POSITION_MESSAGES.degraded[code])
        .filter(Boolean)
        .map((note) => (
          <StatusLine key={note} kind="blocked">
            {note}
          </StatusLine>
        ))}
      {link}
    </div>
  );
};
