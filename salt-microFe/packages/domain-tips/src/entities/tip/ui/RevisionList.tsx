import { formatTipDate } from "../model/format";
import { TIP_MESSAGES as M } from "../model/messages";
import { TipChangeOp, type TipRevision } from "../model/types";
import * as s from "./tip.css";

/**
 * 변경 이력(FR-2) + 바뀐 줄(FR-7) — 최근 것 먼저, 서버 순서 그대로. 줄 비교도 서버가 했다(화면은 그리기만).
 * 빠진 줄은 `<del>`, 들어온 줄은 `<ins>` — 색으로만 가르지 않고 앞 글자(− · +)와 읽기 프로그램 문구를 같이 단다.
 * 바뀐 줄이 없는 판(첫 판 · 상태만 바뀐 판 · 줄을 모르는 옛 이력)은 요약 한 줄만.
 */
export const RevisionList = ({ revisions }: { revisions: TipRevision[] }) => (
  <ul className={s.revisions}>
    {revisions.map((r) => (
      <li key={`${r.revisedAt}-${r.summary}`} className={s.revision}>
        <span>
          <span className={s.revisionDate}>{formatTipDate(r.revisedAt)}</span>
          {r.summary}
        </span>
        {r.changes && r.changes.length > 0 ? (
          <ul className={s.changes} aria-label={M.changesLabel}>
            {r.changes.map((c, i) =>
              c.op === TipChangeOp.Removed ? (
                <li key={`${i}-${c.text}`} className={s.change}>
                  <span className={s.changeMark} aria-hidden>
                    −
                  </span>
                  <del className={s.removed}>
                    <span className={s.srOnly}>{M.changeRemoved} </span>
                    {c.text}
                  </del>
                </li>
              ) : (
                <li key={`${i}-${c.text}`} className={s.change}>
                  <span className={s.changeMark} aria-hidden>
                    +
                  </span>
                  <ins className={s.added}>
                    <span className={s.srOnly}>{M.changeAdded} </span>
                    {c.text}
                  </ins>
                </li>
              ),
            )}
          </ul>
        ) : null}
      </li>
    ))}
  </ul>
);
