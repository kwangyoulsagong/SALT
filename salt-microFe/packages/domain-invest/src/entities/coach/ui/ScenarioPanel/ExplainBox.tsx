import type { SymbolExplanation } from "@repo/core/coach";
import { kstClock, kstMonthDay } from "@repo/core/marketKr";

import { PANEL_MESSAGES as M } from "../../model";
import * as s from "./ScenarioPanel.css";

/** 문장 사이 등장 간격 — 한 문장씩(`FE-REQ-064` FR-10). 길이(240ms)는 토큰, 간격만 여기 */
const STAGGER_MS = 120;
/** 여섯째 문장부터는 같이 — 긴 해설도 1초 안에 다 보이게(`motion.md` §4-1) */
const STAGGER_CAP = 5;

/**
 * AI 해설 상자 — 패널 안 · 문장 4~6개 · 출처는 번호가 아니라 이름 칩(`FE-REQ-064` FR-10).
 *
 * '얼마나 믿을까' · '틀렸던 때' 문장(`track` · `miss`)은 바로 위 성적 줄이 같은 숫자로 그린다 — 여기서 되풀이하지 않는다
 * (같은 숫자 두 번 금지, `screen-desktop.md` §5). AI 표시는 서버가 AI 단이라고 한 때만(`aiGenerated`)
 */
interface ExplainBoxProps {
  view: SymbolExplanation;
  /** 스트림 중 — 끝에 "쓰는 중" 반짝임 한 줄 · 새 문장을 읽어 주는 영역(aria-live). 문장 · 순서는 서버 것 그대로 */
  streaming?: boolean;
}

export const ExplainBox = ({ view, streaming = false }: ExplainBoxProps) => {
  const lines = view.sentences.filter((x) => x.section !== "track" && x.section !== "miss");
  return (
    <section className={s.explain} aria-labelledby="panel-explain">
      <div className={s.explainHead}>
        <h3 id="panel-explain" className={s.explainTitle}>
          {view.aiGenerated ? M.explainHead : M.explainHeadPlain}
        </h3>
        <span className={s.explainSub}>{view.aiGenerated ? M.explainSub : M.explainSubTemplate}</span>
      </div>
      {view.tier === "previous" && (
        <p className={s.explainSub}>{M.explainPrevious(`${kstMonthDay(view.generatedAt)} ${kstClock(view.generatedAt)}`)}</p>
      )}
      <ul className={s.sentences} aria-live={streaming ? "polite" : undefined} aria-busy={streaming || undefined}>
        {lines.map((line, i) => (
          <li key={`${line.section}:${line.text}`} className={s.sentence} style={{ animationDelay: `${Math.min(i, STAGGER_CAP) * STAGGER_MS}ms` }}>
            {line.text}
            {line.citations.map((c) =>
              c.url ? (
                <a key={c.id} className={s.sourceChip} href={c.url} target="_blank" rel="noreferrer noopener">
                  {c.label}
                </a>
              ) : (
                <span key={c.id} className={s.sourceChip}>
                  {c.label}
                </span>
              ),
            )}
          </li>
        ))}
        {streaming && (
          <li className={s.writing}>{M.explainWriting}</li>
        )}
      </ul>
    </section>
  );
};
