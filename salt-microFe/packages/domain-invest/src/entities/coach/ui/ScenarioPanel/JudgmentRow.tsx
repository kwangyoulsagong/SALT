import type { PanelModeView } from "@repo/core/coach";
import { Badge } from "@repo/ui/badge";

import { caveatSentence } from "../../lib";
import { COACH_MESSAGES, PANEL_MESSAGES as M } from "../../model";
import { CoachStaleNote } from "../CoachStaleNote";
import { PanelRow } from "./PanelRow";
import * as s from "./ScenarioPanel.css";

const TIER_TONE = { reference: "neutral", verified: "success", caution: "warning" } as const;

interface JudgmentRowProps {
  /** 패널 응답의 이 기간 모드 판단. `null` = 계약 깨짐 — 지어내지 않고 한 줄 */
  judgment: PanelModeView["judgment"];
  /** 판단 근거 · 주의할 점(종목 판단 응답 — 같은 화면이 이미 부른 캐시). 아직 없으면 접힌 목록을 그리지 않는다 */
  detail?: { reasons: readonly string[]; risks: readonly string[] } | null;
  staleSince?: string | null;
}

/**
 * 지금의 판단 — 판단 카드(요약 · 상세)를 패널 한 줄로(F017 v4 순서 6 · `FE-REQ-064` FR-12).
 *
 * 남기는 것: 라벨 · 서버 한 줄(headline) · 등급 한 단어(참고 · 검증됨 · 주의 — 설명 문단은 뺐다) · 꼬리표 문장(`ADR-010` v2 — 숫자 문장 안에) ·
 * 판단 근거는 접어서. 빼는 것: 점수 n/100(확률로 오해) · 모드 · 유효 기간 메타 줄 · 숫자 네 칸 성적표(아래 성적 줄이 비교 막대로 말한다).
 * 판단 · 등급 · 문장은 전부 서버 값이다
 */
export const JudgmentRow = ({ judgment, detail, staleSince = null }: JudgmentRowProps) => {
  if (!judgment) {
    return (
      <PanelRow kind="judgment">
        <p className={s.sub}>{M.judgmentDefect}</p>
      </PanelRow>
    );
  }
  const caveats = judgment.caveats.map(caveatSentence).filter((text): text is string => text !== null);
  const reasons = detail?.reasons ?? [];
  const risks = detail?.risks ?? [];
  return (
    <PanelRow kind="judgment">
      <div className={s.judgmentHead}>
        <p className={s.mainText}>{judgment.label}</p>
        <span className={s.srOnly}>{M.tierSr}</span>
        <Badge size="sm" tone={TIER_TONE[judgment.grade] ?? "neutral"} className={s.tierBadge}>
          {COACH_MESSAGES.tier.label[judgment.grade] ?? COACH_MESSAGES.tier.label.reference}
        </Badge>
      </div>
      {judgment.headline && <p className={s.sub}>{judgment.headline}</p>}
      {caveats.map((text) => (
        <p key={text} className={s.sub}>
          {text}
        </p>
      ))}
      <CoachStaleNote staleSince={staleSince} />
      {detail && (
        <details className={s.fold}>
          <summary className={s.foldSummary}>{M.judgmentReasons(reasons.length + risks.length)}</summary>
          {reasons.length === 0 && risks.length === 0 && <p className={s.sub}>{M.judgmentNoReason}</p>}
          {reasons.length > 0 && (
            <>
              <p className={s.rowLabel}>{M.judgmentReasonsHead}</p>
              <ul className={`${s.plainList} ${s.sub}`}>
                {reasons.map((reason, i) => (
                  <li key={`${i}-${reason}`}>{reason}</li>
                ))}
              </ul>
            </>
          )}
          {risks.length > 0 && (
            <>
              <p className={s.rowLabel}>{M.judgmentRisksHead}</p>
              <ul className={`${s.plainList} ${s.sub}`}>
                {risks.map((risk, i) => (
                  <li key={`${i}-${risk}`}>{risk}</li>
                ))}
              </ul>
            </>
          )}
        </details>
      )}
    </PanelRow>
  );
};
