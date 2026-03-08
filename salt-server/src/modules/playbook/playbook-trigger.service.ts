import prisma from "../../config/database";

export class PlaybookTriggerService {
  async getUserTriggers(userId: string, status?: string) {
    return prisma.playbookTrigger.findMany({
      where: {
        userId,
        ...(status ? { status: status as any } : {}),
      },
      include: {
        rule: true,
        playbook: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async resolveTrigger(userId: string, triggerId: string) {
    return prisma.playbookTrigger.update({
      where: {
        id: triggerId,
      },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
    });
  }
}
