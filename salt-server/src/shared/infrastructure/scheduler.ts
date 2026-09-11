import cron, { ScheduledTask } from "node-cron";

import { logger } from "../config/logger";

/**
 * cron 등록 지점.
 *
 * **워커는 스케줄과 락만 담당한다**(`server-architecture.md` §7). 유스케이스는
 * `application` 에 있고 워커는 그것을 부른다. 같은 유스케이스를 HTTP 와 스케줄러가
 * 모두 부를 수 있어야 한다.
 *
 * 겹쳐 도는 것을 막는 **인프로세스 락**이 여기 있다. 단일 프로세스라 이걸로 충분하고,
 * 프로세스가 늘면 그때 분산 락으로 바꾼다 — 바꿀 곳이 이 파일 하나다.
 */
const running = new Set<string>();

export const schedule = (
  name: string,
  expression: string,
  task: () => Promise<void> | void
): ScheduledTask =>
  cron.schedule(expression, async () => {
    if (running.has(name)) {
      logger.warn(`스케줄 중복 실행을 건너뛴다: ${name}`);
      return;
    }
    running.add(name);
    try {
      await task();
    } catch (error) {
      logger.error(`스케줄 실패: ${name}`, error);
    } finally {
      running.delete(name);
    }
  });
