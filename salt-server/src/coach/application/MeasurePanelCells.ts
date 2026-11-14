import { logger } from "../../shared/config/logger";

import { PANEL_CELL_KEYS_ALL, type PanelCellCheckRow, type PanelCellCheckStore, type PanelUniverseProbe } from "../domain";
import type { GetCoachPanel } from "./GetCoachPanel";

/** 동시에 부르는 패널 수 — 패널 하나가 쿼리 여럿을 같이 낸다(연결 풀 17, `workers-external.md`). 실측 동시 4 에서 꼬리가 길었다 */
const PANEL_CHECK_CONCURRENCY = 2;
/** 보관 — 상태 점검은 마지막 회차만, 추이는 한 달이면 충분하다 */
export const PANEL_CHECK_KEEP_DAYS = 30;
/** 실측이 부르는 사람 — 보유 · 계획이 없는 고정 id(내 기준 칸은 세지 않는다). 사람 데이터를 읽지 않는다 */
const PROBE_USER = { userId: "00000000-0000-4000-8000-0000000000c1" } as const;

export interface PanelCheckSummary {
  runAt: string;
  symbols: number;
  rows: number;
  /** 결함 단 칸 수(회사 사정 포함 — F017 v4 2d 부터 재료가 있다) */
  defects: number;
  stale: number;
  newSymbols: number;
  failed: number;
}

/**
 * 패널 칸 채움 실측(OPS-004 FR-1 · 3 · 4 · F017 v4 수용 기준 "모든 종목 · 모든 칸에 늘 데이터").
 *
 * 사람이 열 수 있는 종목 전부(화면 시세 목록 100 ∪ 관심 · 보유 ∪ 국내 유니버스)의 한 장 패널(`GetCoachPanel` — 화면과 같은 유스케이스)을 불러 칸 표(`cells`)를 그대로 남긴다. 단 판정은 패널이 이미 했다 —
 * 여기는 세기만. 패널 자체가 실패한 종목은 칸 열하나 모두 결함으로 센다(빈 줄을 만들지 않는다). 상태 점검은 표만 읽는다(FR-5 — 5초 안)
 */
export class MeasurePanelCells {
  constructor(
    private readonly deps: {
      panel: Pick<GetCoachPanel, "execute">;
      universe: PanelUniverseProbe;
      store: PanelCellCheckStore;
      now?: () => Date;
    }
  ) {}

  async execute(): Promise<PanelCheckSummary> {
    const runAt = this.deps.now?.() ?? new Date();
    const [symbols, previous] = await Promise.all([this.deps.universe.symbols(), this.deps.store.latestRunSymbols()]);
    const rows: PanelCellCheckRow[] = [];
    let failed = 0;

    const queue = [...symbols];
    const worker = async () => {
      for (let symbol = queue.shift(); symbol !== undefined; symbol = queue.shift()) {
        const newSymbol = previous.size > 0 && !previous.has(symbol);
        try {
          const view = await this.deps.panel.execute(PROBE_USER, symbol);
          const stale = view.verdict.check?.conditionReason === "stale_reference";
          for (const c of view.cells) rows.push({ market: view.market, symbol, cellKey: c.key, tier: c.tier, stale, newSymbol });
        } catch (error) {
          failed += 1;
          logger.warn(`패널 칸 실측 실패 — 칸 전부 결함으로: ${symbol} ${(error as Error).name}`);
          const market = /^\d{6}$/.test(symbol) ? "kr" : "crypto";
          for (const key of PANEL_CELL_KEYS_ALL) rows.push({ market, symbol, cellKey: key, tier: "defect", stale: false, newSymbol });
        }
      }
    };
    await Promise.all(Array.from({ length: PANEL_CHECK_CONCURRENCY }, worker));

    const saved = await this.deps.store.saveRun(runAt, rows);
    await this.deps.store.pruneBefore(new Date(runAt.getTime() - PANEL_CHECK_KEEP_DAYS * 86_400_000));
    const symbolsStale = new Set(rows.filter((r) => r.stale).map((r) => r.symbol)).size;
    const symbolsNew = new Set(rows.filter((r) => r.newSymbol).map((r) => r.symbol)).size;
    return {
      runAt: runAt.toISOString(),
      symbols: symbols.length,
      rows: saved,
      defects: rows.filter((r) => r.tier === "defect").length,
      stale: symbolsStale,
      newSymbols: symbolsNew,
      failed,
    };
  }
}
