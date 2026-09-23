"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`InvestmentsBoard` 와 같은 이유).
import dynamic from "next/dynamic";

import type { MarketOverviewItem } from "@/entities/market";

import { detailStack } from "./InvestmentDetail.css";
import { SymbolHeader } from "./SymbolHeader";

/**
 * 본문(차트 · 판단 · 해설 · 수익 플랜)은 **`ssr:false` 다** — 판단 조회는 토큰이 필요하고 토큰은
 * 브라우저 `localStorage` 에만 있다(`FE-REQ-013` 전). 서버에서 그리면 "로그인 안 됨"으로 그렸다가
 * 브라우저에서 다른 것을 그려 수화 불일치가 난다.
 */
const SymbolAnalysis = dynamic(
  () => import("@/widgets/symbol-analysis").then((mod) => mod.SymbolAnalysis),
  { ssr: false, loading: () => null },
);

/**
 * 머리(뒤로 · 종목 · 가격 · 지표)는 **서버에서도 그린다** — 크롤러가 받는 HTML 에 종목 이름 ·
 * 가격이 있어야 한다. 서버가 받은 공개 시세를 첫 렌더 값으로 준다.
 */
export const InvestmentDetailBody = ({
  symbol,
  initialListing,
}: {
  symbol: string;
  initialListing: MarketOverviewItem | null;
}) => (
  <div className={detailStack}>
    <SymbolHeader symbol={symbol} initialListing={initialListing} />
    <SymbolAnalysis symbol={symbol} />
  </div>
);

export default InvestmentDetailBody;
