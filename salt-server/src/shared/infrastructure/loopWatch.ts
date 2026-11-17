import { monitorEventLoopDelay } from "node:perf_hooks";

import { logger } from "../config/logger";

import { runningJobs } from "./scheduler";

/** 이 간격마다 지연을 본다 · 최대 지연이 이 값을 넘으면 한 줄 — BFF 패널 예산(400ms)의 절반 */
const WATCH_INTERVAL_MS = 5_000;
export const LOOP_STALL_WARN_MS = 200;

/**
 * 이벤트 루프 막힘 감시(2026-11-17) — 재기동 뒤 1분 남짓 아무 일 없는 경로(`/internal/symbols`)까지 100ms 넘게 걸리고 패널이 504 였는데
 * DB 는 한가했다. 막힌 5초 창의 최대 지연과 **그때 돌던 스케줄 작업 이름**을 남긴다 — 다음엔 짐작 없이 범인을 안다.
 * 비용은 히스토그램 하나(해상도 20ms). 서버 프로세스에서만 켠다
 */
export const startLoopWatch = (warnMs = LOOP_STALL_WARN_MS) => {
  const histogram = monitorEventLoopDelay({ resolution: 20 });
  histogram.enable();
  const timer = setInterval(() => {
    const maxMs = Math.round(histogram.max / 1e6);
    const p99Ms = Math.round(histogram.percentile(99) / 1e6);
    if (maxMs >= warnMs) {
      const jobs = runningJobs();
      logger.warn("이벤트 루프 막힘", { maxMs, p99Ms, jobs: jobs.length > 0 ? jobs : ["(스케줄 밖 작업)"] });
    }
    histogram.reset();
  }, WATCH_INTERVAL_MS);
  timer.unref();
  return () => {
    clearInterval(timer);
    histogram.disable();
  };
};
