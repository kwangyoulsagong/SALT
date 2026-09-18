import prisma from "../../shared/infrastructure/prisma";
import type { UserCountProbe } from "../domain";

/**
 * 활성 계정 수 (FR-3).
 *
 * **"활성"의 정의가 여기 있다.** 지금은 탈퇴 개념이 없어 전체 행 수와 같지만, 도메인이
 * `prisma.user.count()` 를 직접 불렀다면 나중에 탈퇴가 생길 때 **정의가 도메인 안에서
 * 바뀌어야 한다.** Port 뒤에 두면 그 변경이 이 파일 한 줄이다.
 */
export class PrismaUserCountProbe implements UserCountProbe {
  countActive(): Promise<number> {
    return prisma.user.count();
  }
}
