/**
 * 판정 성적표 뷰모델 — **순수 함수** (F010 슬라이스 3 · `BFF-REQ-039` FR-5).
 *
 * 서버 `/coach/scoreboard`(`SRV-REQ-025` FR-15 · FR-53)는 종목 판단 스냅샷을 신호 유형(`<mode>.<action>`)별로 모은
 * 성적이다. **사용자별이 아니다** — 누가 보든 같은 표다. BFF 가 하는 일:
 *
 * 1. 모양을 검사한다. 신호 유형 · 표본 수가 깨진 그룹은 뺀다(0 으로 채우지 않는다)
 * 2. 표본 부족(`lowSample`) 판정은 **서버 값만** 옮긴다. 여기서 문턱을 다시 세지 않는다
 * 3. 맞았던 때 · 틀렸던 때를 **같은 모양 · 같은 상한**으로 둘 다 옮긴다(서버 B2). 어느 쪽을 먼저 그릴지는 화면 몫
 *
 * 하지 않는 것: 수익률 분포(`returnDistribution`) 옮기기 — 화면이 아직 쓰지 않는다. 목표가 · 예측 필드는 서버에 없다.
 *
 * 여기에는 import 가 없다(`symbol-coach.viewmodel.ts` 와 같은 이유 — 순수 뷰모델 `performance-claim` 만 예외).
 */

import { toPerformanceClaim, type PerformanceClaim } from "./performance-claim.viewmodel";

type Raw = Record<string, unknown>;

const isRecord = (value: unknown): value is Raw =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const num = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;
const str = (value: unknown): string | null => (typeof value === "string" && value !== "" ? value : null);

/** `[kr_stock.]<mode>.<action>` — 국내 주식 그룹은 자산군 접두가 붙는다(F011 FR-61) */
const SIGNAL_TYPE = /^(?:kr_stock\.)?(scalp|long_term)\.[a-z_]+$/;

export interface ScoreboardCase {
  date: string;
  symbol: string;
  /** 그룹 키 `<mode>.<action>`. 문구가 아니다 */
  event: string;
  outcome: "hit" | "miss";
  /** 관찰 기간 수익률 — **과거 값** */
  returnRate: number;
}

export interface ScoreboardGroup {
  signalType: string;
  /** 자산군(F011 FR-65) — 화면은 코인 옆에 국내 주식을 **나란히** 놓고 합산하지 않는다. 국내 주식은 소유자에게만 온다 */
  assetClass: "crypto" | "kr_stock";
  mode: "scalp" | "long_term";
  sample: number;
  /** 표본 0 이면 `null` — 0% 가 아니다 */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  /** 서버 판정(표본 20 미만). 화면은 이때 적중률 대신 "아직 채점 표본이 적어요"를 쓴다 */
  lowSample: boolean;
  horizonHours: number | null;
  alwaysUpRate: number | null;
  /** 적중률 − 기저율. 관망은 `null` */
  excessWinRate: number | null;
  /** 기간 · 표본 · 기준 · 빗나간 수(F009 FR-33). 서버가 옛 버전이면 `null` */
  claim: PerformanceClaim | null;
  hits: ScoreboardCase[];
  misses: ScoreboardCase[];
}

export interface JudgmentScoreboardView {
  status: "ok" | "insufficient_data";
  groups: ScoreboardGroup[];
  disclaimer: string;
  generatedAt: string | null;
}

export type JudgmentScoreboardResult = JudgmentScoreboardView | { status: "unavailable" };

export class ScoreboardContractError extends Error {
  constructor(field: string) {
    super(`judgment scoreboard contract broken: ${field}`);
  }
}

const toCase = (raw: unknown, outcome: "hit" | "miss"): ScoreboardCase | null => {
  if (!isRecord(raw)) return null;
  const date = str(raw.date);
  const symbol = str(raw.symbol);
  const event = str(raw.event);
  const returnRate = num(raw.returnRate);
  // 맞음 칸에 틀림이 섞여 오면 옮기지 않는다 — 칸 이름이 곧 주장이다
  if (!date || !symbol || !event || returnRate === null || raw.outcome !== outcome) return null;
  return { date, symbol, event, outcome, returnRate };
};

const toCases = (raw: unknown, outcome: "hit" | "miss"): ScoreboardCase[] =>
  (Array.isArray(raw) ? raw : []).flatMap((item) => {
    const view = toCase(item, outcome);
    return view ? [view] : [];
  });

const toGroup = (raw: unknown): ScoreboardGroup | null => {
  if (!isRecord(raw)) return null;
  const signalType = str(raw.signalType);
  const sample = num(raw.sample);
  const matched = signalType ? SIGNAL_TYPE.exec(signalType) : null;
  if (!signalType || !matched || sample === null || sample < 0) return null;
  return {
    signalType,
    // 그룹 키가 진실이다 — 서버 `assetClass` 와 다르면 키를 따른다(접두가 표본을 가른 실제 기준)
    assetClass: signalType.startsWith("kr_stock.") ? "kr_stock" : "crypto",
    mode: matched[1] === "scalp" ? "scalp" : "long_term",
    sample: Math.floor(sample),
    winRate: sample > 0 ? num(raw.winRate) : null,
    avgReturn: num(raw.avgReturn),
    worstObservedReturn: num(raw.worstObservedReturn),
    // 모르면 부족이다 — 표본이 충분하다는 주장은 서버만 한다
    lowSample: raw.lowSample !== false,
    horizonHours: num(raw.horizonHours),
    alwaysUpRate: num(raw.alwaysUpRate),
    excessWinRate: num(raw.excessWinRate),
    claim: toPerformanceClaim(raw.claim),
    hits: toCases(raw.hits, "hit"),
    misses: toCases(raw.misses, "miss"),
  };
};

export const toJudgmentScoreboardViewModel = (data: Raw): JudgmentScoreboardView => {
  const disclaimer = str(data.disclaimer);
  if (!disclaimer) throw new ScoreboardContractError("disclaimer");
  if (!Array.isArray(data.groups)) throw new ScoreboardContractError("groups");
  const groups = data.groups.flatMap((item) => {
    const group = toGroup(item);
    return group ? [group] : [];
  });
  return {
    // 서버가 ok 라고 해도 남은 그룹이 없으면 "표본 없음"이다
    status: data.status === "ok" && groups.length > 0 ? "ok" : "insufficient_data",
    groups,
    disclaimer,
    generatedAt: str(data.generatedAt),
  };
};
