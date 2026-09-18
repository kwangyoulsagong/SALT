import prisma from "../../shared/infrastructure/prisma";
import type { AccountCredential, AccountStore, AccountView } from "../domain";

export class PrismaAccountStore implements AccountStore {
  async existsByEmail(email: string): Promise<boolean> {
    const found = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    return found !== null;
  }

  async findCredentialByEmail(email: string): Promise<AccountCredential | null> {
    return prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, passwordHash: true },
    });
  }

  async findById(userId: string): Promise<AccountView | null> {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImageUrl: true,
        totalPoints: true,
        userLevel: true,
        createdAt: true,
        lastLoginAt: true,
      },
    });
  }

  async touchLastLogin(userId: string, at: Date): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { lastLoginAt: at } });
  }
}
