import { EXPENSE_MESSAGES as M, envelopeLabel, formatWon } from "../model/messages";
import type { HouseholdEnvelope } from "../model/types";
import * as s from "./expense.css";

/** 막대 길이(0~100) — 표시용 비율만(금액 계산이 아니다). 넘치면 100 */
const fillPercent = (e: HouseholdEnvelope): number => (e.budget <= 0 ? 0 : Math.min(100, Math.max(0, (e.spent / e.budget) * 100)));

/**
 * 봉투별 남은 돈(FR-6). **넘친 봉투도 같은 모양 · 같은 색** — 남은 돈이 "−3,000원"으로 보일 뿐이다(차단 · 경고 0).
 */
export const EnvelopeList = ({ envelopes, unbudgeted }: { envelopes: HouseholdEnvelope[]; unbudgeted: number | null }) => (
  <ul className={s.stack} aria-label={M.envelopes}>
    {envelopes.map((e) => (
      <li key={e.key} className={s.box}>
        <div className={s.row}>
          <span className={s.title}>{envelopeLabel(e.key)}</span>
          <span className={s.value}>
            {M.remaining} {formatWon(e.remaining)}
          </span>
        </div>
        <div className={s.bar} aria-hidden>
          <div className={s.barFill} style={{ width: `${fillPercent(e)}%` }} />
        </div>
        <span className={s.note}>{M.envelopeSpent(formatWon(e.spent), formatWon(e.budget))}</span>
      </li>
    ))}
    {unbudgeted !== null && unbudgeted > 0 ? (
      <li className={s.row}>
        <span className={s.label}>{M.unbudgeted}</span>
        <span className={s.value}>{formatWon(unbudgeted)}</span>
      </li>
    ) : null}
  </ul>
);
