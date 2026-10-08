"use client";

import dynamic from "next/dynamic";

/**
 * 국내 주식 상세 본문 — `ssr:false`. 시세가 소유자 전용이라 토큰(브라우저 `localStorage`)이 있어야 부를 수 있고, 서버 HTML 에
 * 국내 주식 시세를 넣지 않는다(KRX 재배포 약관 — F011 §정책). `InvestmentDetailBody` 와 같은 이유로 서버 컴포넌트에서 못 부른다
 */
const KrStockDetail = dynamic(() => import("./KrStockDetail").then((mod) => mod.KrStockDetail), {
  ssr: false,
  loading: () => null,
});

export const KrStockDetailBody = ({ code }: { code: string }) => <KrStockDetail code={code} />;

export default KrStockDetailBody;
