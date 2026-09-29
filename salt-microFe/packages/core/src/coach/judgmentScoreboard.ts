/**
 * 판정 성적표 뷰모델 — `GET /api/app/coach/scoreboard` 응답 `data` (F010 슬라이스 3 · `BFF-REQ-039` FR-5).
 *
 * BFF `judgment-scoreboard.viewmodel.ts` 가 소유하는 계약의 사본이다. 신호 유형(`<mode>.<action>`)별 성적이고
 * **사용자별이 아니다** — 누가 보든 같은 표다. 표본 부족(`lowSample`)은 서버 판정이다 — 화면이 문턱을 세지 않는다.
 * 맞았던 때 · 틀렸던 때는 같은 모양 · 같은 상한이다. 목표가 · 예측 필드는 없다.
 */

export interface ScoreboardCase {
  date: string;
  symbol: string;
  /** 그룹 키 `<mode>.<action>` */
  event: string;
  outcome: "hit" | "miss";
  /** 관찰 기간 수익률 — 과거 값 */
  returnRate: number;
}

export interface ScoreboardGroup {
  signalType: string;
  mode: "scalp" | "long_term";
  sample: number;
  /** 표본 0 이면 `null` */
  winRate: number | null;
  avgReturn: number | null;
  worstObservedReturn: number | null;
  lowSample: boolean;
  horizonHours: number | null;
  alwaysUpRate: number | null;
  /** 적중률 − 기저율. 관망은 `null` */
  excessWinRate: number | null;
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
