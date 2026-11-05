import { formatDay, formatMonth, formatWon } from "./messages";
import type { HouseholdStory, HouseholdStoryLine } from "./types";

/**
 * 이야기 카드 문장(가계부 S1g — `FE-REQ-057` FR-9). **화면 카드와 공유 이미지가 같은 문장을 쓴다** — 이 파일 하나에서 만든다.
 * 사실만: 점수 · 순위 · 지난번 대비 · 칭찬 · 재촉 0. 어떤 줄이 나올지 · 금액 · 몫은 서버 값(여기서 계산 0).
 * 금액은 가릴 수 있다 — 공유는 가림이 기본(FEATURE-013 FR-21). 가린 자리는 [StoryPart.masked] 로 표시해 화면이 읽기 이름을 붙인다.
 */
export const STORY_MESSAGES = {
  monthTitle: (period: string) => `${formatMonth(period)} 이야기`,
  yearTitle: (period: string) => `${period}년 이야기`,
  masked: "•••원",
  maskedLabel: "가린 금액",
  spent: "쓴 돈",
  count: (n: number) => `${n}건`,
  recordedDays: (n: number) => `${n}일 적었어요`,
  approx: "대략 포함",
  topCategory: "가장 많이 쓴 분류",
  share: (percent: number) => `${percent}%`,
  topMonth: "가장 많이 쓴 달",
  noSpendDays: (n: number) => `안 쓴 날 ${n}일`,
  challengeDays: (n: number) => `챌린지 한 날 ${n}일`,
  challengeSaved: "아낀 돈",
  feelingsTagged: (n: number) => `기분을 남긴 지출 ${n}건`,
  empty: "이 기간에 적은 기록이 없어요",
  readyOn: (date: string) => `${formatDay(date)}부터 볼 수 있어요`,
} as const;

/** 줄 한 조각 — masked 면 가린 금액 자리 */
export interface StoryPart {
  text: string;
  masked?: boolean;
}

export interface StoryText {
  title: string;
  lines: StoryPart[][];
}

const SEP: StoryPart = { text: " · " };

/** "2026-10" → "2026년 10월 이야기", "2026" → "2026년 이야기" */
export const storyTitle = (story: Pick<HouseholdStory, "period" | "scope">): string =>
  story.scope === "year" ? STORY_MESSAGES.yearTitle(story.period) : STORY_MESSAGES.monthTitle(story.period);

const amountPart = (amount: number | null, showAmounts: boolean): StoryPart =>
  showAmounts ? { text: formatWon(amount ?? 0) } : { text: STORY_MESSAGES.masked, masked: true };

/** "2026-03" → "3월" — 해 카드의 달 이름 */
const monthName = (ym: string): string => formatMonth(ym).split(" ")[1] ?? ym;

const joinParts = (parts: StoryPart[]): StoryPart[] => parts.flatMap((p, i) => (i === 0 ? [p] : [SEP, p]));

/** 줄 하나 → 조각들. 모르는 kind 는 null(건너뛴다 — 서버가 줄을 더해도 깨지지 않게) */
export const storyLine = (line: HouseholdStoryLine, opts: { showAmounts: boolean; label: (key: string) => string }): StoryPart[] | null => {
  const M = STORY_MESSAGES;
  const amount = amountPart(line.amount, opts.showAmounts);
  switch (line.kind) {
    case "spent":
      return joinParts([
        { text: M.spent },
        amount,
        { text: M.count(line.count ?? 0) },
        { text: M.recordedDays(line.days ?? 0) },
        ...(line.approx ? [{ text: M.approx }] : []),
      ]);
    case "top_category":
      return joinParts([{ text: M.topCategory }, { text: opts.label(line.category ?? "other") }, { text: M.share(line.sharePercent ?? 0) }, amount]);
    case "top_month":
      return joinParts([{ text: M.topMonth }, { text: monthName(line.month ?? "") }, amount]);
    case "no_spend_days":
      return [{ text: M.noSpendDays(line.days ?? 0) }];
    case "challenge_days":
      return [{ text: M.challengeDays(line.days ?? 0) }];
    case "challenge_saved":
      return joinParts([{ text: M.challengeSaved }, amount]);
    case "feelings_tagged":
      return [{ text: M.feelingsTagged(line.count ?? 0) }];
    default:
      return null;
  }
};

/** 카드 전체 문장 — 화면 카드와 공유 이미지가 같이 쓴다 */
export const storyText = (story: HouseholdStory, opts: { showAmounts: boolean; label: (key: string) => string }): StoryText => ({
  title: storyTitle(story),
  lines: story.lines.map((l) => storyLine(l, opts)).filter((parts): parts is StoryPart[] => parts !== null),
});

/** 조각 → 한 줄 글자(공유 이미지 · 대체 글) */
export const plainLine = (parts: StoryPart[]): string => parts.map((p) => p.text).join("");
