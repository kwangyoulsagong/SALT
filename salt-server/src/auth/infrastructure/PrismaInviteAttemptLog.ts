import { logger } from "../../shared/config/logger";
import prisma from "../../shared/infrastructure/prisma";
import type { InviteAttemptLog } from "../domain";

/** 코드 원문을 남기지 않는다. 앞 4자면 어느 배치의 코드가 시도됐는지 알기에 충분하다. */
const PREFIX_LENGTH = 4;

/**
 * 실패한 코드 시도 기록 (FR-7). **잠금 정책은 만들지 않는다.**
 *
 * 기록 실패가 가입을 막지 않는다 — 감사 로그가 가용성을 좌우하면 안 된다.
 */
export class PrismaInviteAttemptLog implements InviteAttemptLog {
  async record(attempt: {
    code: string;
    reason: string;
    clientKey?: string;
  }): Promise<void> {
    try {
      await prisma.inviteCodeAttempt.create({
        data: {
          codePrefix: attempt.code.slice(0, PREFIX_LENGTH),
          reasonCode: attempt.reason,
          clientKey: attempt.clientKey ?? null,
        },
      });
    } catch (error) {
      logger.warn("초대 코드 시도 기록에 실패했다", { error });
    }
  }
}
