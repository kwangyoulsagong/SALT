"use client";

import { BOARD_MESSAGES as B, EXPENSE_MESSAGES as M, formatWon } from "../model/messages";
import type { HouseholdEnvelope } from "../model/types";
import { useCategoryLabel } from "./CategoryNames";
import * as s from "./board.css";

/** 막대 길이(0~100) — 표시용 비율만(금액 계산이 아니다). 넘치면 100 */
const fillPercent = (e: HouseholdEnvelope): number => (e.budget <= 0 ? 0 : Math.min(100, Math.max(0, (e.spent / e.budget) * 100)));

/**
 * 봉투 목록 행(`FE-REQ-060` FR-3 · FR-4 · H5) — 이름 · 쓴 돈/예산(보조) · 오른쪽 남은 돈. 사이드 312 에 두므로 분류 판은 뺀다(보조 줄이 잘렸다). 넘친 봉투는 같은 색 음수 숫자(빨강 · 경고 0, `FE-REQ-057` 수용 기준).
 * 숫자는 서버 값
 */
export const EnvelopeRows = ({ envelopes, unbudgeted }: { envelopes: HouseholdEnvelope[]; unbudgeted: number | null }) => {
  const label = useCategoryLabel();
  return (
    <ul className={s.rows} aria-label={M.envelopes}>
      {envelopes.map((e) => {
        const name = label.envelope(e.key);
        return (
          <li key={e.key} className={s.row}>
            <span className={s.rowMain}>
              <span className={s.rowTitle}>{name}</span>
              <span className={s.rowCaption}>{B.envelopeLine(formatWon(e.spent), formatWon(e.budget))}</span>
              <span className={s.bar} aria-hidden>
                <span className={s.barFill} style={{ display: "block", width: `${fillPercent(e)}%` }} />
              </span>
            </span>
            <span className={s.amount}>{B.envelopeRemaining(formatWon(e.remaining))}</span>
          </li>
        );
      })}
      {unbudgeted !== null && unbudgeted > 0 ? (
        <li className={s.row}>
          <span className={s.rowMain}>
            <span className={s.rowCaption}>{M.unbudgeted}</span>
          </span>
          <span className={s.amount}>{formatWon(unbudgeted)}</span>
        </li>
      ) : null}
    </ul>
  );
};
