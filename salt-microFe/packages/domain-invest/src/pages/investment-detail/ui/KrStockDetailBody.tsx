"use client";

import dynamic from "next/dynamic";

/**
 * 국내 주식 상세 본문 — `ssr:false`. ~~시세가 소유자 전용이라 토큰이 있어야 부를 수 있고~~(2026-11-10 게스트 토큰으로 누구나 — `ADR-011`), 서버 HTML 에
 * 국내 주식 시세를 넣지 않는다(KRX 재배포 약관 — F011 §정책). `InvestmentDetailBody` 와 같은 이유로 서버 컴포넌트에서 못 부른다
 * (2026-11-05 정정: 토큰은 이제 httpOnly 쿠키라 서버도 읽는다 — `FE-REQ-013` FR-80 2단계. 그래도 국내 시세는 약관상 서버 HTML 에 넣지 않으므로 클라이언트에 남는다 — FR-81 대상 아님)
 */
const KrStockDetail = dynamic(() => import("./KrStockDetail").then((mod) => mod.KrStockDetail), {
  ssr: false,
  loading: () => null,
});

export const KrStockDetailBody = ({ code }: { code: string }) => <KrStockDetail code={code} />;

export default KrStockDetailBody;
