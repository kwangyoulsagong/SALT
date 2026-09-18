import prisma from "../../shared/infrastructure/prisma";
import type {
  AccountView,
  InviteCodeSnapshot,
  InviteCodeStore,
  NewAccount,
} from "../domain";

/** 응답에 실리는 계정 필드. 해시를 절대 싣지 않기 위해 select 를 한 곳에 둔다. */
const ACCOUNT_SELECT = {
  id: true,
  email: true,
  nickname: true,
  profileImageUrl: true,
  totalPoints: true,
  userLevel: true,
  createdAt: true,
  lastLoginAt: true,
} as const;

export class PrismaInviteCodeStore implements InviteCodeStore {
  async findByCode(code: string): Promise<InviteCodeSnapshot | null> {
    const row = await prisma.inviteCode.findUnique({ where: { code } });
    if (!row) return null;

    return {
      id: row.id,
      code: row.code,
      expiresAt: row.expiresAt,
      usedByUserId: row.usedByUserId,
    };
  }

  /**
   * 코드 점유 + 계정 생성을 **한 트랜잭션**으로 한다.
   *
   * `updateMany({ where: { id, usedByUserId: null } })` 가 돌려주는 `count` 가 조건부
   * UPDATE 다. 두 요청이 동시에 오면 **하나만 1 을 받고** 나머지는 0 을 받아 트랜잭션이
   * 롤백된다 — 계정도 함께 사라진다.
   *
   * `update` 가 아니라 `updateMany` 인 이유는 `update` 가 `where` 에 유니크 필드만 받기
   * 때문이다. 조건이 `id` + `usedByUserId IS NULL` 이라 `updateMany` 여야 한다.
   *
   * 순서가 **계정 먼저**인 것은 `usedByUserId` 가 FK 라서다. 실패해도 같은 트랜잭션이라
   * 남지 않는다.
   */
  async redeem(
    codeId: string,
    account: NewAccount,
    at: Date
  ): Promise<AccountView | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email: account.email,
            nickname: account.nickname,
            passwordHash: account.passwordHash,
          },
          select: ACCOUNT_SELECT,
        });

        const claimed = await tx.inviteCode.updateMany({
          where: { id: codeId, usedByUserId: null },
          data: { usedByUserId: user.id, usedAt: at },
        });

        if (claimed.count === 0) {
          // 롤백시키는 유일한 방법이다. 바깥에서 `null` 로 옮긴다.
          throw new InviteAlreadyClaimed();
        }

        return user;
      });
    } catch (error) {
      if (error instanceof InviteAlreadyClaimed) return null;
      throw error;
    }
  }
}

/** 트랜잭션 롤백 신호. 이 파일 밖으로 나가지 않는다. */
class InviteAlreadyClaimed extends Error {}
