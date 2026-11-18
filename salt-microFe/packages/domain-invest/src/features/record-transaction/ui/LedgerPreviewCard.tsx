"use client";

import { StatusLine } from "@repo/ui/statusLine";

import { INSUFFICIENT_QUANTITY_CODE, type LedgerFigures, type TransactionPreviewVM } from "@/entities/portfolio";
import type { ApiError } from "@repo/web-shared/api";
import { formatPrice } from "@repo/web-shared/lib";

import { LEDGER_SHEET_MESSAGES as M } from "../model";
import { previewBox, previewKey, previewRow, previewRows, previewTitle, previewValue } from "./LedgerSheet.css";

const quantityText = (n: number) => (n === 0 ? M.preview.none : n.toLocaleString("ko-KR", { maximumFractionDigits: 8 }));
const wonText = (n: number, quantity: number) => (quantity === 0 ? M.preview.none : `${formatPrice(n)}원`);

const ROWS: Array<{ label: string; read: (f: LedgerFigures) => string }> = [
  { label: M.preview.quantity, read: (f) => quantityText(f.quantity) },
  { label: M.preview.average, read: (f) => wonText(f.averageBuyPrice, f.quantity) },
  { label: M.preview.invested, read: (f) => wonText(f.totalInvested, f.quantity) },
];

interface LedgerPreviewCardProps {
  /** 입력이 아직 다 차지 않았으면 `false` — 안내만 */
  ready: boolean;
  data: TransactionPreviewVM | undefined;
  isFetching: boolean;
  error: ApiError | null;
}

/**
 * 저장 전 서버 미리보기(`FE-REQ-030` FR-104 · `FE-REQ-031` FR-81 · 82) — 보유 수량 · 평단 · 총 취득금액 전 → 후. 숫자는 전부 서버 값이고
 * 여기서 곱하거나 나누지 않는다. 과매도는 사유 문구(저장 막음은 시트가), 다른 실패는 "불러올 수 없습니다"(저장은 된다)
 */
export const LedgerPreviewCard = ({ ready, data, isFetching, error }: LedgerPreviewCardProps) => {
  if (!ready) return <p className={previewKey}>{M.preview.idle}</p>;
  if (error?.code === INSUFFICIENT_QUANTITY_CODE) {
    return (
      <StatusLine kind="blocked" live>
        {M.insufficient}
      </StatusLine>
    );
  }
  if (error) {
    return (
      <StatusLine kind="error" live>
        {M.preview.failed}
      </StatusLine>
    );
  }
  if (!data) {
    return (
      <StatusLine kind="progress" live>
        {M.preview.loading}
      </StatusLine>
    );
  }
  return (
    <section className={previewBox} aria-busy={isFetching} aria-live="polite">
      <h3 className={previewTitle}>{M.preview.heading}</h3>
      <dl className={previewRows}>
        {ROWS.map((row) => {
          const before = row.read(data.before);
          const after = row.read(data.after);
          return (
            <div key={row.label} className={previewRow}>
              <dt className={previewKey}>{row.label}</dt>
              <dd className={previewValue}>
                {before} {M.preview.arrow} {after}
              </dd>
            </div>
          );
        })}
      </dl>
      <p className={previewKey}>{M.preview.note}</p>
    </section>
  );
};
