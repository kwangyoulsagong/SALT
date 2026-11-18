"use client";

// 클라이언트 잎: 거래 목록 · 시트 열고 닫기가 브라우저 쪽이다(포지션 위젯과 같은 이유).
import { Button } from "@repo/ui/button";
import { EmptyState } from "@repo/ui/emptyState";
import { StatusGraphic } from "@repo/ui/statusGraphic";
import { StatusLine } from "@repo/ui/statusLine";
import { Text } from "@repo/ui/text";
import { useState } from "react";

import {
  LEDGER_SIDE_LABEL,
  TRANSACTION_LIST_MESSAGES as M,
  TransactionRow,
  toKoreanDate,
  useTransactionPages,
  type PositionTransactionVM,
} from "@/entities/portfolio";
import { LEDGER_SHEET_MESSAGES, TransactionSheet } from "@/features/record-transaction";
import { panel, panelHead, panelTitle } from "@repo/web-shared/ui/surface.css";

import { description, head, headAction, list, more, rowButton } from "./TransactionList.css";

/**
 * 보유 기록 관리(F006 G절 2단계 · `FE-REQ-030` FR-106 · 108 · FEATURE-006 FR-75) — 최신순 목록 · 행 → 같은 시트로 고치기(종목 · 구분 잠김) ·
 * 시트 안에서 지우기. 저장 · 수정 · 삭제 뒤 목록 · 포지션은 서버 값으로 다시 받는다(낙관적 갱신 0). 주문 링크 · 버튼 0. 조합만 한다
 */
export const TransactionList = () => {
  const pages = useTransactionPages();
  const [sheet, setSheet] = useState<{ open: boolean; editing: PositionTransactionVM | null }>({ open: false, editing: null });
  const close = () => setSheet((current) => ({ ...current, open: false }));

  if (pages.isSignedOut) return null; // 페이지가 유리막을 그린다

  const items = pages.data?.pages.flatMap((page) => page.items) ?? [];
  const namesDegraded = pages.data?.pages.some((page) => page.namesDegraded) ?? false;

  return (
    <section className={panel} aria-labelledby="transaction-list" aria-busy={pages.isPending}>
      <div className={`${panelHead} ${head}`}>
        <h2 id="transaction-list" className={panelTitle}>
          {M.heading}
        </h2>
        <Button size="sm" variant="weak" className={headAction} onClick={() => setSheet({ open: true, editing: null })}>
          {LEDGER_SHEET_MESSAGES.openButton}
        </Button>
      </div>
      <p className={description}>{M.description}</p>

      {pages.isPending ? (
        <Text color="tertiary">{M.loading}</Text>
      ) : pages.isError ? (
        <StatusLine kind="error">{M.loadFailed}</StatusLine>
      ) : items.length === 0 ? (
        <EmptyState iconFrame="none" icon={<StatusGraphic kind="empty" />} title={M.empty} />
      ) : (
        <>
          {namesDegraded ? <StatusLine kind="blocked">{M.namesDegraded}</StatusLine> : null}
          <ul className={list}>
            {items.map((transaction) => (
              <li key={transaction.id}>
                <button
                  type="button"
                  className={rowButton}
                  aria-label={M.rowLabel(transaction.name, LEDGER_SIDE_LABEL[transaction.side], toKoreanDate(transaction.transactionDate))}
                  onClick={() => setSheet({ open: true, editing: transaction })}
                >
                  <TransactionRow transaction={transaction} />
                </button>
              </li>
            ))}
          </ul>
          {pages.hasNextPage ? (
            <div className={more}>
              <Button variant="weak" size="sm" loading={pages.isFetchingNextPage} onClick={() => pages.fetchNextPage()}>
                {M.more}
              </Button>
            </div>
          ) : null}
        </>
      )}

      <TransactionSheet open={sheet.open} onClose={close} editing={sheet.editing} />
    </section>
  );
};
