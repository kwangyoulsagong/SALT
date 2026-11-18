"use client";

// 클라이언트 잎: 거래 한 줄 표시만 한다(누르면 무엇을 할지는 부르는 쪽).
import { AssetIcon } from "@repo/ui/assetIcon";
import { Badge } from "@repo/ui/badge";

import { formatPrice } from "@repo/web-shared/lib";

import {
  LEDGER_SIDE_LABEL,
  TRANSACTION_LIST_MESSAGES as M,
  toKoreanDate,
  type PositionTransactionVM,
} from "../model/position";
import { ledgerAmounts, ledgerIdentity, ledgerName, ledgerRow, ledgerSub, ledgerTexts, ledgerTotal } from "./position.css";

/**
 * 거래 기록 한 줄(F006 G절 2단계 · `FE-REQ-030` FR-106) — 표시 전용. 총액은 서버가 저장한 값(수량 × 단가)이고 여기서 곱하지 않는다.
 * 매수/매도는 글자 배지(손익 색 up/down 을 쓰지 않는다 — 매도는 손실이 아니다). 버튼 안에 놓이므로 `<p>` 없이 `span` 만
 */
export const TransactionRow = ({ transaction }: { transaction: PositionTransactionVM }) => (
  <span className={ledgerRow}>
    <span className={ledgerIdentity}>
      {/* 국내 주식 코드는 숫자라 이니셜이 "00" — 이름으로(보유 목록과 같다) */}
      <AssetIcon
        symbol={transaction.assetType === "kr_stock" ? transaction.name : transaction.symbol}
        src={transaction.logoUrl ?? undefined}
        name={transaction.name}
        size="md"
      />
      <span className={ledgerTexts}>
        <span className={ledgerName}>{transaction.name}</span>
        <span className={ledgerSub}>{toKoreanDate(transaction.transactionDate)}</span>
      </span>
      <Badge tone={transaction.side === "buy" ? "brand" : "neutral"} size="sm">
        {LEDGER_SIDE_LABEL[transaction.side]}
      </Badge>
    </span>
    <span className={ledgerAmounts}>
      <span className={ledgerTotal}>{formatPrice(transaction.totalAmount)}원</span>
      <span className={ledgerSub}>
        {M.quantityAt(transaction.quantity.toLocaleString("ko-KR", { maximumFractionDigits: 8 }), formatPrice(transaction.price))}
      </span>
    </span>
  </span>
);
