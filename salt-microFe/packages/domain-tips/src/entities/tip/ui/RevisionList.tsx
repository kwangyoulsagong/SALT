import { formatTipDate } from "../model/format";
import type { TipRevision } from "../model/types";
import * as s from "./tip.css";

/** 변경 이력(FR-2 · FR-7 첫 판) — 최근 것 먼저, 서버 순서 그대로 */
export const RevisionList = ({ revisions }: { revisions: TipRevision[] }) => (
  <ul className={s.revisions}>
    {revisions.map((r) => (
      <li key={`${r.revisedAt}-${r.summary}`}>
        <span className={s.revisionDate}>{formatTipDate(r.revisedAt)}</span>
        {r.summary}
      </li>
    ))}
  </ul>
);
