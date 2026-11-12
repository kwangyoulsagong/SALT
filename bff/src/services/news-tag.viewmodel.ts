/**
 * 소식 측정 태그 뷰모델(F017 단계 6 · `BFF-REQ-052` FR-5) — **순수 함수**. 국내 소식 · 코인 종목 뉴스가 같이 쓴다.
 *
 * 서버 값을 옮기기만 한다(계산 0). 모르는 `label` · 깨진 모양이면 태그 `null` — 행은 그대로(새 서버가 라벨을 늘려도 화면이 모르는 칩을 그리지 않게).
 * 문구는 화면 몫: up_usually = 보통 올랐던 소식 · down_usually = 보통 내렸던 소식 · mixed = 반응 엇갈림 · few = 같은 종류 n건뿐. 호재 · 악재 단어 0
 */

export type NewsTagLabelVM = "up_usually" | "down_usually" | "mixed" | "few";

export interface NewsReactionVM {
  days: 1 | 5;
  sample: number;
  /** 시장보다 더 오른 비율(0~1) — 표본 미달이면 null */
  upRate: number | null;
  /** 평균 초과 반응 — 단순 비율(0.012 = +1.2%, 서버가 바꿔 준다) · 표본 미달이면 null */
  mean: number | null;
  /** 평소 시장보다 더 오른 비율(0~1) */
  baseUpRate: number | null;
}

export interface NewsTagVM {
  eventKind: string;
  eventKindText: string;
  label: NewsTagLabelVM;
  reaction: NewsReactionVM;
  reaction5d: NewsReactionVM | null;
  /** 소식 전 5봉 초과 수익 — 단순 비율 · 없으면 null */
  preMove5d: number | null;
}

const LABELS: readonly string[] = ["up_usually", "down_usually", "mixed", "few"];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

const toReaction = (raw: unknown, days: 1 | 5): NewsReactionVM | null => {
  if (!isObj(raw)) return null;
  const sample = num(raw.sample);
  if (sample === null || sample < 0) return null;
  return { days, sample, upRate: num(raw.upRate), mean: num(raw.mean), baseUpRate: num(raw.baseUpRate) };
};

export const toNewsTagVM = (raw: unknown): NewsTagVM | null => {
  if (!isObj(raw)) return null;
  const { eventKind, eventKindText, label } = raw;
  if (typeof eventKind !== "string" || !eventKind || typeof eventKindText !== "string" || !eventKindText) return null;
  if (typeof label !== "string" || !LABELS.includes(label)) return null;
  const reaction = toReaction(raw.reaction, 1);
  if (!reaction) return null;
  return {
    eventKind,
    eventKindText,
    label: label as NewsTagLabelVM,
    reaction,
    reaction5d: toReaction(raw.reaction5d, 5),
    preMove5d: num(raw.preMove5d),
  };
};
