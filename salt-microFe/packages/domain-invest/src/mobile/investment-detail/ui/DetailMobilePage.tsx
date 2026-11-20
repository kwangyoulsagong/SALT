import { notFound } from "next/navigation";

import { isKrStockCode } from "@repo/core/marketKr";
import { BlockBoundary } from "@repo/web-shared/ui";
import { MobileScreen } from "@repo/web-shared/layout/mobile";

import { INVESTMENT_DETAIL_MOBILE as M } from "../model/messages";
import { DetailMobileBody } from "./DetailMobileBody";

/** 업비트 KRW 마켓 심볼 · 국내 6자리 — 데스크톱 상세(`parseSymbolParam`)와 같은 모양 · 같은 대문자 표기(쿼리 키가 갈리지 않게) */
const SYMBOL_PATTERN = /^[A-Za-z0-9]{1,20}$/;

/** 휴대폰 종목 상세 `/m/investments/[symbol]`(`FE-REQ-072` FR-3) — 라우트 파라미터 해석까지만. 모양이 아니면 404 */
export const DetailMobilePage = async ({ params }: { params: Promise<{ symbol: string }> }) => {
  const { symbol: raw } = await params;
  if (!SYMBOL_PATTERN.test(raw)) notFound();
  const symbol = raw.toUpperCase();
  return (
    <MobileScreen>
      <BlockBoundary name={M.blockName} minHeight={480}>
        <DetailMobileBody symbol={symbol} asset={isKrStockCode(symbol) ? "kr" : "crypto"} />
      </BlockBoundary>
    </MobileScreen>
  );
};
