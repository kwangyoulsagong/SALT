"use client";

import type { SymbolExplanation } from "@repo/core/coach";
import { kstClock, kstMonthDay } from "@repo/core/marketKr";
import { Illustration } from "@repo/ui/illustration";
import { durations, ease, usePlayAfterMount } from "@repo/ui/motion";
import { m } from "framer-motion";

import { PANEL_MESSAGES as M } from "../../model";
import * as s from "./ScenarioPanel.css";

/** 문장 사이 등장 간격(초) — 한 문장씩(`FE-REQ-064` FR-10). 길이(240ms)는 토큰, 간격만 여기 */
const STAGGER_S = 0.12;
/** 여섯째 문장부터는 같이 — 긴 해설도 1초 안에 다 보이게(`motion.md` §4-1) */
const STAGGER_CAP = 5;

/**
 * AI 해설 상자 — 패널 안 · 문장 4~6개 · 출처는 번호가 아니라 이름 칩(`FE-REQ-064` FR-10).
 *
 * '얼마나 믿을까' · '틀렸던 때' 문장(`track` · `miss`)은 바로 위 성적 줄이 같은 숫자로 그린다 — 여기서 되풀이하지 않는다
 * (같은 숫자 두 번 금지, `screen-desktop.md` §5). AI 표시는 서버가 AI 단이라고 한 때만(`aiGenerated`)
 *
 * **움직임은 보일 때 한 번**(`FE-REQ-079` FR-6 · `motion.md` §5) — 상자는 패널 맨 아래라 그려질 때 재생하면 사용자가 내려왔을 땐 끝나 있었다
 * (사용자 2026-11-26 "밑에 있어서 도는데 안 보여서 그런가 — 보는 시점에 나와야"). 서버 HTML · 첫 렌더는 끝 장면(`usePlayAfterMount`),
 * 마운트 뒤 화면에 들어오면 머리 그림(코치 말풍선) → 문장이 차례로. 날을 바꾸면 쓰는 쪽이 `key` 로 다시 마운트해 다시 재생
 */
interface ExplainBoxProps {
  view: SymbolExplanation;
  /** 스트림 중 — 끝에 "쓰는 중" 반짝임 한 줄 · 새 문장을 읽어 주는 영역(aria-live). 문장 · 순서는 서버 것 그대로 */
  streaming?: boolean;
}

export const ExplainBox = ({ view, streaming = false }: ExplainBoxProps) => {
  const lines = view.sentences.filter((x) => x.section !== "track" && x.section !== "miss");
  const played = usePlayAfterMount();
  return (
    <section className={s.explain} aria-labelledby="panel-explain">
      <div className={s.explainHead}>
        <span className={s.explainTitleGroup}>
          <Illustration scene="coachBubble" size="xs" />
          <h3 id="panel-explain" className={s.explainTitle}>
            {view.aiGenerated ? M.explainHead : M.explainHeadPlain}
          </h3>
        </span>
        <span className={s.explainSub}>{view.aiGenerated ? M.explainSub : M.explainSubTemplate}</span>
      </div>
      {view.tier === "previous" && (
        <p className={s.explainSub}>{M.explainPrevious(`${kstMonthDay(view.generatedAt)} ${kstClock(view.generatedAt)}`)}</p>
      )}
      <m.ul
        key={played ? "play" : "still"}
        className={s.sentences}
        initial={played ? "hidden" : false}
        whileInView="shown"
        // 조금이라도 보이면 — 30% 로 두면 목록 윗줄이 화면에 걸린 채 빈칸으로 남는 순간이 있었다(2026-11-26 실화면 1회차 "0 0 0 1")
        viewport={{ once: true, amount: "some" }}
        aria-live={streaming ? "polite" : undefined}
        aria-busy={streaming || undefined}
      >
        {lines.map((line, i) => (
          <m.li
            key={`${line.section}:${line.text}`}
            className={s.sentence}
            variants={{
              hidden: { opacity: 0, y: 6 },
              shown: {
                opacity: 1,
                y: 0,
                // 스트림으로 뒤에 붙는 문장은 바로 — 차례 간격은 처음 한 번만
                transition: { duration: durations.base, ease: ease.enter, delay: streaming ? 0 : Math.min(i, STAGGER_CAP) * STAGGER_S },
              },
            }}
          >
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
          </m.li>
        ))}
        {streaming && (
          <li className={s.writing}>
            <span className={s.writingDot} aria-hidden="true" />
            {M.explainWriting}
          </li>
        )}
      </m.ul>
    </section>
  );
};
