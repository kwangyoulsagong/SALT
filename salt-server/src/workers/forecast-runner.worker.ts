import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { env } from "../shared/config/env";
import { logger } from "../shared/config/logger";
import { schedule } from "../shared/infrastructure/scheduler";

/**
 * 전망 배치 트리거 — F008 `FC-REQ-004` · `ADR-004`.
 *
 * 사용자 결정(2026-09-23) *"서버 키면 자동으로 되게"*. macOS 가 백그라운드 에이전트(launchd)의 데스크탑 폴더 접근을
 * 막아서, 사용자가 터미널에서 띄우는 이 서버가 배치를 걸어 준다.
 *
 * **서버는 걸기만 한다.** 언제 돌지(마지막 성공이 20시간 안이면 건너뜀)는 배치가 스스로 판단하고, 결과는 배치가
 * `forecast` 스키마에 쓴다. 서버는 `forecast` 테이블을 읽지 않는다(`salt-forecast/.claude/rules/db-contract.md`).
 * 요청 경로와 무관한 자식 프로세스라 배치가 실패 · 지연돼도 API 는 영향이 없다.
 */
export class ForecastRunnerWorker {
  private child: ChildProcess | null = null;

  constructor(
    private readonly script = env.FORECAST_RUNNER_SCRIPT ??
      path.resolve(process.cwd(), "../salt-forecast/ops/daily.sh")
  ) {}

  start() {
    if (!env.FORECAST_RUNNER_ENABLED) return;
    if (!fs.existsSync(this.script)) {
      logger.warn(`전망 배치 스크립트가 없다 — 트리거 끔: ${this.script}`);
      return;
    }
    console.log("🔮 Forecast runner started (부팅 + 매시)");
    this.trigger("boot");
    schedule("forecast-runner", "5 * * * *", () => this.trigger("hourly"));
  }

  /** 이미 돌고 있으면 건너뛴다. 로그는 salt-forecast/ops/daily.log 에 붙인다. */
  private trigger(reason: string) {
    if (this.child) {
      logger.info(`전망 배치 실행 중 — ${reason} 트리거 건너뜀`);
      return;
    }
    const log = fs.openSync(path.join(path.dirname(this.script), "daily.log"), "a");
    const child = spawn("/bin/zsh", [this.script], { stdio: ["ignore", log, log] });
    this.child = child;
    child.on("error", (error) => {
      logger.error("전망 배치 시작 실패", error);
      this.child = null;
      fs.closeSync(log);
    });
    child.on("exit", (code) => {
      if (code !== 0) logger.warn(`전망 배치 종료 코드 ${code} — salt-forecast/ops/daily.log`);
      this.child = null;
      fs.closeSync(log);
    });
  }

  /** 서버 종료 때 배치를 같이 끝낸다 — 배치는 멱등이라 다음 부팅에 다시 돈다. */
  stop() {
    this.child?.kill("SIGTERM");
  }
}
