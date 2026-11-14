import type { CoachPanel, CompanyFact } from "@repo/core/coach";
import { StatusLine } from "@repo/ui/statusLine";

import { PANEL_MESSAGES as M } from "../../model";
import { PanelRow } from "./PanelRow";
import * as s from "./ScenarioPanel.css";

/** 출처 — 이름 칩 → 원문(새 창). 해설 상자 칩과 같은 모양 */
const Source = ({ fact }: { fact: CompanyFact }) => (
  <a className={s.sourceChip} href={fact.source.url} target="_blank" rel="noreferrer noopener" aria-label={M.companySourceSr(fact.source.name)}>
    {fact.source.name}
  </a>
);

type GroupKey = keyof typeof M.companyGroups;

/**
 * ③ 회사 사정(F017 v4 2d · `FE-REQ-064` FR-9 ③) — 서버가 원문에서 뽑은 사실(한 줄 · 실적 · 오늘 · 최근 · 업계 · 걸리는 점). 문구 · 숫자는 서버 것이고
 * 여기는 그리기만 한다. 걸리는 점은 서버가 사실이 있으면 늘 싣는다(좋은 점만 싣지 않는다). 사실이 없어도 줄을 숨기지 않는다 — 없다는 것도 데이터
 */
export const CompanyRow = ({ company }: { company: CoachPanel["company"] }) => {
  const brief = company.brief;
  if (!brief) {
    return (
      <PanelRow kind="company">
        <StatusLine kind="error">{M.companyDefect}</StatusLine>
      </PanelRow>
    );
  }
  const groups: Array<{ key: GroupKey; items: Array<{ id: string; text: string; fact: CompanyFact | null }> }> = [
    { key: "earnings", items: brief.earnings.map((f) => ({ id: f.source.url + f.text, text: f.text, fact: f })) },
    { key: "today", items: brief.today.map((f) => ({ id: f.source.url + f.text, text: f.text, fact: f })) },
    { key: "recent", items: brief.recent.map((f) => ({ id: f.source.url + f.text, text: f.text, fact: f })) },
    { key: "sector", items: brief.sector.map((x) => ({ id: x.text, text: `${x.text} · ${x.source}`, fact: null })) },
    { key: "concern", items: brief.concern.map((f) => ({ id: f.source.url + f.text, text: f.text, fact: f })) },
  ];
  return (
    <PanelRow kind="company">
      {brief.headline ? (
        <p className={s.mainText}>
          {brief.headline.text}
          <Source fact={brief.headline} />
        </p>
      ) : (
        <>
          <p className={s.mainText}>{M.companyNone}</p>
          <p className={s.sub}>{M.companyNoneNote}</p>
        </>
      )}
      {groups
        .filter((g) => g.items.length > 0)
        .map((g) => (
          <div key={g.key} className={s.companyGroup}>
            <h4 className={s.companyGroupLabel}>{M.companyGroups[g.key]}</h4>
            <ul className={s.companyList}>
              {g.items.map((item) => (
                <li key={item.id} className={s.sub}>
                  {item.text}
                  {item.fact && <Source fact={item.fact} />}
                </li>
              ))}
            </ul>
          </div>
        ))}
      {brief.windowDays === 90 || brief.windowDays === 365 ? <p className={s.sub}>{M.companyWindow(brief.windowDays)}</p> : null}
    </PanelRow>
  );
};
