"use client";

// 클라이언트 잎: 거래 목록 조회 · 시트가 브라우저 쪽이다(포트폴리오 본문과 같은 이유 — `PortfolioBody`).
import dynamic from "next/dynamic";

import { SignInRequired } from "@repo/web-shared/ui";

import { PORTFOLIO_TRANSACTIONS_PAGE } from "../model";

const List = dynamic(() => import("@/widgets/transaction-list").then((mod) => mod.TransactionList), {
  ssr: false,
  loading: () => null,
});

/** 로그인 없이 오면 유리막(`FE-REQ-070` FR-7) — 거래는 사람 칸 */
export const PortfolioTransactionsBody = () => (
  <SignInRequired what={PORTFOLIO_TRANSACTIONS_PAGE.title} minHeight={PORTFOLIO_TRANSACTIONS_PAGE.blockMinHeight}>
    <List />
  </SignInRequired>
);
