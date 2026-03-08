import prisma from "../../config/database";

export class PlaybookService {
  async createPlaybook(userId: string, data: any) {
    return prisma.investmentPlaybook.create({
      data: {
        userId,
        name: data.name,
        assetType: data.assetType,
        targetAllocation: data.targetAllocation ?? {},
        rules: {
          create: data.rules.map((rule: any) => ({
            type: rule.type,
            symbol: rule.symbol,
            params: rule.params,
          })),
        },
      },
      include: { rules: true },
    });
  }

  async getPlaybooks(userId: string) {
    return prisma.investmentPlaybook.findMany({
      where: { userId },
      include: { rules: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async deletePlaybook(userId: string, id: string) {
    return prisma.investmentPlaybook.delete({
      where: { id },
    });
  }
}
