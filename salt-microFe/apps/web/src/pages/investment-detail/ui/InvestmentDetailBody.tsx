"use client";

// 클라이언트 잎: `ssr:false` 는 서버 컴포넌트에서 쓸 수 없다(`InvestmentsBoard` 와 같은 이유).
import dynamic from "next/dynamic";

/**
 * 상세 분석 본문. **`ssr:false` 다** — 판단 조회는 토큰이 필요하고 토큰은 브라우저
 * `localStorage` 에만 있다(`FE-REQ-013` 전). 서버에서 그리면 "로그인 안 됨"으로 그렸다가
 * 브라우저에서 다른 것을 그려 수화 불일치가 난다.
 */
const SymbolAnalysis = dynamic(
  () => import("@/widgets/symbol-analysis").then((mod) => mod.SymbolAnalysis),
  { ssr: false, loading: () => null },
);

export const InvestmentDetailBody = ({ symbol }: { symbol: string }) => (
  <SymbolAnalysis symbol={symbol} />
);

export default InvestmentDetailBody;
