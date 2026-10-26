import {
  isForecastOwner,
  JUDGMENT_CASE_LIMIT,
  judgmentModeOf,
  krTrackOrigin,
  toScoreboardGroup,
  type JudgmentCase,
  type JudgmentGroupStats,
  type JudgmentOutcome,
  type JudgmentTrackOrigin,
  type MarketProbe,
  type ScoreboardGroupStats,
  type SymbolJudgmentStore,
} from "../domain";
import {
  JUDGMENT_DISCLAIMER,
  loadCaseLabels,
  toCaseView,
  type JudgmentCaseView,
} from "./lib/judgmentTrack";

export interface ScoreboardGroupView extends ScoreboardGroupStats {
  /** 맞았던 때와 틀렸던 때. **같은 모양 · 같은 상한**이다(`SRV-REQ-024` FR-161 · B2). */
  hits: JudgmentCaseView[];
  misses: JudgmentCaseView[];
}

export interface JudgmentScoreboardView {
  /** 표본이 하나도 없으면 `insufficient_data`. 빈 표를 `ok` 라고 하지 않는다(FR-35). */
  status: "ok" | "insufficient_data";
  groups: ScoreboardGroupView[];
  disclaimer: string;
  generatedAt: string;
}

/**
 * 판단 성적표 — 신호 유형별 성적과 수익률 분포 (F004 · `SRV-REQ-025` FR-15 · FR-53).
 *
 * ## 사용자별이 아니다
 *
 * 표본은 종목 판단 스냅샷이고 그 판단은 사용자와 무관하다(`TrackedAssetProbe` 가 심볼만
 * 준다). 그래서 `userId` 를 받지 않는다 — 인증은 필요하지만 **누가 보든 같은 표**다.
 * 사용자별 필터를 넣고 싶어지면 그건 표본을 쪼개는 일이고, 20건 게이트가 영영 안 열린다.
 *
 * ## 국내 주식 그룹은 소유자에게만 (F011 슬라이스 4)
 *
 * 국내 주식 판단 그룹(`kr_stock.*`)은 자산군 라벨을 달고 코인 그룹 옆에 **나란히** 온다(FR-65 — 합산 없음).
 * 사례에 국내 주식 종목 · 수익률이 실리므로 시세 경로와 같은 소유자 판정으로 거른다 — 비소유자 표엔 그 그룹이 없다.
 *
 * ## 적중과 실패를 같이 준다
 *
 * 실패만 주면 화면이 실패를 강조하게 되고, 적중만 주면 광고가 된다. 둘을 **같은 구조 ·
 * 같은 상한 3건**으로 준다(B2). 어느 쪽을 먼저 그릴지는 프론트의 판단이다.
 */
export class GetJudgmentScoreboard {
  constructor(
    private readonly judgments: SymbolJudgmentStore,
    /** 국내 주식 그룹을 볼 수 있는 이메일 — 시세 경로와 같은 목록 */
    private readonly krViewerEmails: readonly string[] = [],
    /**
     * 국내 주식 백테스트 성적(`backtest` 출처만, F011 슬라이스 7b · 사용자 결정 2026-10-26) — 국내 그룹마다 판단 카드와
     * **같은 출처 선택**(`krTrackOrigin`). 라이브 그룹과 합산하지 않는다
     */
    private readonly backtest: SymbolJudgmentStore | null = null,
    /** 사례 종목 이름 · 로고 */
    private readonly market: Pick<MarketProbe, "assetLabels"> | null = null
  ) {}

  async execute(viewerEmail?: string): Promise<JudgmentScoreboardView> {
    const krVisible = isForecastOwner(viewerEmail, this.krViewerEmails);
    const fallback = krVisible ? this.backtest : null;
    const noCases = new Map<string, Record<JudgmentOutcome, JudgmentCase[]>>();
    const [stats, casesByGroup, backtestStats, backtestCases] = await Promise.all([
      this.judgments.scoreboard(),
      this.judgments.recentCasesByGroup(JUDGMENT_CASE_LIMIT),
      fallback ? fallback.scoreboard() : Promise.resolve<JudgmentGroupStats[]>([]),
      fallback ? fallback.recentCasesByGroup(JUDGMENT_CASE_LIMIT) : Promise.resolve(noCases),
    ]);

    // 국내 그룹은 라이브 · 백테스트 중 하나(판단 카드와 같은 규칙 — 합산 없음). 라이브에 없는 국내 그룹은 백테스트가
    // 조건을 넘을 때만 온다(빈 라이브 행을 만들지 않는다)
    const live = new Map(stats.map((group) => [group.signalType, group]));
    const backtestByType = new Map(
      backtestStats.filter((group) => group.signalType.startsWith("kr_stock.")).map((group) => [group.signalType, group])
    );
    const chosen: Array<{ group: JudgmentGroupStats; origin: JudgmentTrackOrigin }> = [];
    // 순서는 저장소 순서(SQL 정렬) 그대로, 백테스트에만 있는 그룹은 뒤에
    for (const signalType of new Set([...live.keys(), ...backtestByType.keys()])) {
      const liveGroup = live.get(signalType);
      const backtestGroup = backtestByType.get(signalType);
      if (backtestGroup && krTrackOrigin(liveGroup?.sample ?? 0, backtestGroup) === "backtest") {
        chosen.push({ group: backtestGroup, origin: "backtest" });
      } else if (liveGroup) {
        chosen.push({ group: liveGroup, origin: "live" });
      }
    }

    const casesFor = (signalType: string, origin: JudgmentTrackOrigin) =>
      (origin === "backtest" ? backtestCases : casesByGroup).get(signalType);
    const labels = await loadCaseLabels(
      this.market,
      chosen.flatMap(({ group, origin }) => {
        const cases = casesFor(group.signalType, origin);
        return [...(cases?.hit ?? []), ...(cases?.miss ?? [])].map((item) => item.symbol);
      })
    );

    const groups = chosen.flatMap(({ group, origin }): ScoreboardGroupView[] => {
      const mode = judgmentModeOf(group.signalType);
      // 이 테이블은 `<mode>.<action>` 만 쓴다. 다른 모양이 있으면 기간을 말할 수 없으므로
      // 숫자를 지어내지 않고 뺀다.
      if (!mode) return [];

      const view = toScoreboardGroup(mode, group, origin);
      if (view.assetClass === "kr_stock" && !krVisible) return [];

      const cases = casesFor(group.signalType, origin);
      return [
        {
          ...view,
          hits: (cases?.hit ?? []).map((item) => toCaseView(group.signalType, "hit", item, labels)),
          misses: (cases?.miss ?? []).map((item) => toCaseView(group.signalType, "miss", item, labels)),
        },
      ];
    });

    return {
      status: groups.length > 0 ? "ok" : "insufficient_data",
      groups,
      disclaimer: JUDGMENT_DISCLAIMER,
      generatedAt: new Date().toISOString(),
    };
  }
}
