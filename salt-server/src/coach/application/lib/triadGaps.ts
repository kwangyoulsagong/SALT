import { TRIAD_DEFECTS, type CoachMode, type JudgmentAssetClass, type JudgmentCaveatReason } from "../../domain";

/**
 * 3종 결함 세기(`SRV-REQ-053` FR-8) — 판단 응답을 만들 때 결함 꼬리표가 붙은 **종목 수**를 시장 · 모드별로.
 * 같은 종목을 여러 번 열어도 한 번(집합). 10분마다 `ReportTriadGaps` 가 한 줄로 남기고 비운다 — 상태 점검(`OPS-003`)이 그 줄을 읽는다.
 * 프로세스 안 상태라 재시작하면 0 부터 — 지표 저장소가 없어 로그가 지표다(KIS 10분 줄과 같다)
 */
interface Group {
  judged: Set<string>;
  defects: Map<string, Set<JudgmentCaveatReason>>;
}

const groups = new Map<string, Group>();

export const recordTriad = (
  assetClass: JudgmentAssetClass,
  mode: CoachMode,
  symbol: string,
  caveats: readonly JudgmentCaveatReason[]
) => {
  const key = `${assetClass}.${mode}`;
  const group = groups.get(key) ?? { judged: new Set<string>(), defects: new Map() };
  groups.set(key, group);
  group.judged.add(symbol);
  const found = caveats.filter((reason) => TRIAD_DEFECTS.includes(reason));
  if (found.length > 0) group.defects.set(symbol, new Set(found));
  else group.defects.delete(symbol);
};

export interface TriadGapRow {
  group: string;
  judged: number;
  defects: number;
  reasons: Partial<Record<JudgmentCaveatReason, number>>;
}

export const drainTriadGaps = (): TriadGapRow[] => {
  const rows = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, g]) => {
      const reasons: Partial<Record<JudgmentCaveatReason, number>> = {};
      for (const set of g.defects.values()) for (const r of set) reasons[r] = (reasons[r] ?? 0) + 1;
      return { group, judged: g.judged.size, defects: g.defects.size, reasons };
    });
  groups.clear();
  return rows;
};
