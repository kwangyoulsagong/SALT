import type { CoachMode } from "../model";
import type { ExplanationCitation, ExplanationSentence } from "./explanationSnapshot";
import { COACH_HORIZON } from "./horizon";

/**
 * 쉬운 말 해설 — 서버가 숫자 그대로 쓰는 "얼마나 믿을까" 문장(F017 v4 순서 1c · `SRV-REQ-053` FR-16 · `ADR-010` v4).
 *
 * ## 3종은 해설 문장에도 늘 세트
 *
 * 근거 · 과거 적중률 · 실패 사례 중 적중률 · 실패 사례 두 칸은 **LLM 이 쓰지 않는다** — 판단 블록과 같은 값(`trackRecord` ·
 * `failureCases`)으로 서버가 쓴다. 그래서 해설마다 늘 있고(LLM 이 빠뜨릴 수 없다) 숫자가 판단 블록과 어긋날 수 없다.
 * 표본이 없으면 "없다"를 그대로 쓴다 — 빈 칸 0(`ADR-010` v2: 비면 과거 검산으로 채우고, 그래도 비면 결함을 말한다).
 * 반올림은 판단 블록(`JudgmentSummary` `trackVsBaseline`)과 같다 — 정수 %, 기준 = 적중률 − 기준 대비.
 */

const pct1 = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v).toFixed(1)}%`;

export interface PlainTrackInput {
  mode: CoachMode;
  /** 0~1. 표본 0 이면 `null` */
  winRate: number | null;
  /** 적중률 − 기준. 관망 · 기준 없음이면 `null` */
  excessWinRate: number | null;
  sample: number;
  origin: "live" | "backtest";
}

/** 적중률 — 판단 블록 "이 판단 n% · 늘 같은 행동 m%" 와 같은 값 · 같은 반올림(정수 %) */
export const plainTrack = (t: PlainTrackInput): string => {
  const horizon = COACH_HORIZON[t.mode].phrase;
  if (t.winRate === null || t.sample === 0) {
    return `이 판단은 아직 채점된 기록이 없어요 — 과거 시세로 되돌려 채점한 기록도 아직 없어서 얼마나 맞는지 말할 수 없어요.`;
  }
  const win = Math.round(t.winRate * 100);
  const hits = Math.round(t.winRate * t.sample);
  const head = t.origin === "backtest" ? `과거 시세로 되돌려 채점해 보면` : `이 판단은 지금까지`;
  const base = `${head} ${t.sample.toLocaleString("ko-KR")}번 중 ${hits.toLocaleString("ko-KR")}번 맞았어요(${win}%, ${horizon} 기준).`;
  if (t.excessWinRate === null) return base;
  const baseline = Math.round((t.winRate - t.excessWinRate) * 100);
  const gap = win - baseline;
  const compare =
    gap === 0
      ? `판단 없이 늘 같은 쪽을 골랐어도 ${baseline}%라 아직 더 낫다고 말하기 어려워요.`
      : gap > 0
        ? `판단 없이 늘 같은 쪽을 골랐다면 ${baseline}% — 그보다 ${gap}%p 높아요.`
        : `판단 없이 늘 같은 쪽을 골랐다면 ${baseline}% — 오히려 ${Math.abs(gap)}%p 낮아서 참고로만 보는 게 맞아요.`;
  return `${base} ${compare}`;
};

export interface PlainMissInput {
  date: string;
  name: string | null;
  symbol: string;
  /** 관찰 기간 수익률(0~1 비율) */
  returnRate: number;
}

/** 틀렸던 때 — 가장 최근 빗나간 사례 둘. 없으면 없다고(채점이 없으면 적중률 문장이 이미 말한다) */
export const PLAIN_MISS_MAX = 2;
export const plainMisses = (mode: CoachMode, misses: readonly PlainMissInput[], sample: number): string[] => {
  if (misses.length === 0) {
    return [
      sample > 0
        ? `채점한 ${sample.toLocaleString("ko-KR")}번 중 아직 빗나간 사례를 찾지 못했어요 — 표본이 적으면 그럴 수 있어요.`
        : `빗나간 사례도 아직 없어요 — 채점된 판단이 없어서예요.`,
    ];
  }
  const horizon = COACH_HORIZON[mode].phrase.replace("판단 뒤 ", "");
  return misses.slice(0, PLAIN_MISS_MAX).map((m) => {
    const who = m.name ?? m.symbol;
    const move =
      m.returnRate > 0 ? `${pct1(m.returnRate * 100)} 올랐어요` : m.returnRate < 0 ? `${pct1(m.returnRate * 100)} 내렸어요` : "그대로였어요";
    // 칸 이름("틀렸던 때")은 화면 제목 · 인용 이름이 말한다 — 문장 앞에 되풀이하지 않는다(2026-11-13 실화면)
    return `${m.date} ${who}도 같은 판단이었는데 ${horizon} 뒤 ${move}.`;
  });
};

/** 성적 출처 — 판단 블록과 같은 칸 이름 */
const TRACK_CITATION: ExplanationCitation = { id: "track", label: "이 판단의 성적", at: null, url: null };

export interface PlainTrustInput {
  mode: CoachMode;
  track: PlainTrackInput;
  misses: readonly PlainMissInput[];
}

/**
 * "얼마나 믿을까" 칸 — 적중률 한 줄 + 틀렸던 때(최대 둘). 해설의 어느 단(최신 AI · 이전 AI · 사실표 · 없음)이든 **늘 뒤에 붙는다**.
 * 저장하지 않는다 — 읽을 때 지금 판단 블록 값으로 쓴다(성적이 갱신되면 해설을 다시 만들지 않아도 같은 숫자)
 */
export const plainTrustSentences = ({ mode, track, misses }: PlainTrustInput): ExplanationSentence[] => [
  { section: "track", text: plainTrack(track), citations: [TRACK_CITATION] },
  ...plainMisses(mode, misses, track.sample).map((text, i) => ({
    section: "miss" as const,
    text,
    citations: [
      misses[i]
        ? { id: `miss-${i + 1}`, label: `틀렸던 때 · ${misses[i].date}`, at: null, url: null }
        : TRACK_CITATION,
    ],
  })),
];
