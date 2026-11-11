import { logger } from "../../shared/config/logger";
import { drainTriadGaps } from "./lib/triadGaps";

/**
 * 3종 결함 10분 줄(`SRV-REQ-053` FR-8) — `🧩 3종 결함 10분: crypto.long_term 1/12(backtest_missing 1) · … · 합 1`.
 * 이 줄의 "합" 을 상태 점검(`OPS-003` FR-2)이 읽는다. 판단을 하나도 안 만든 10분은 "판단 없음"
 */
export class ReportTriadGaps {
  execute() {
    const rows = drainTriadGaps();
    const total = rows.reduce((sum, row) => sum + row.defects, 0);
    const parts = rows.map((row) => {
      const why = Object.entries(row.reasons).map(([r, n]) => `${r} ${n}`).join(", ");
      return `${row.group} ${row.defects}/${row.judged}${why ? `(${why})` : ""}`;
    });
    logger.info(`🧩 3종 결함 10분: ${parts.join(" · ") || "판단 없음"} · 합 ${total}`);
    return { rows, total };
  }
}
