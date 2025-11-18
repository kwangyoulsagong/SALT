import prisma from '../../config/database';
import { NotFoundError, ForbiddenError } from '../../utils/error.util';
import { CreateGoalDto, UpdateGoalDto, AddSavingDto, QueryGoalsDto } from './goals.dto';

export class GoalsService {
  async createGoal(userId: string, data: CreateGoalDto) {
    const goal = await prisma.goal.create({
      data: {
        userId,
        title: data.title,
        category: data.category,
        targetAmount: data.targetAmount,
        startDate: new Date(data.startDate),
        targetDate: new Date(data.targetDate),
        themeColor: data.themeColor,
      },
      include: {
        transactions: true,
      },
    });

    return goal;
  }

  async getGoals(userId: string, query: QueryGoalsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.status) {
      where.status = query.status;
    }

    const [goals, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          transactions: {
            orderBy: { transactionDate: 'desc' },
            take: 5,
          },
          _count: {
            select: { transactions: true },
          },
        },
      }),
      prisma.goal.count({ where }),
    ]);

    return {
      goals,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getGoalById(userId: string, goalId: string) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        transactions: {
          orderBy: { transactionDate: 'desc' },
        },
        _count: {
          select: { transactions: true },
        },
      },
    });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    return goal;
  }

  async updateGoal(userId: string, goalId: string, data: UpdateGoalDto) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
        completedAt: data.status === 'completed' ? new Date() : undefined,
      },
      include: {
        transactions: true,
      },
    });

    return updatedGoal;
  }

  async deleteGoal(userId: string, goalId: string) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    await prisma.goal.delete({
      where: { id: goalId },
    });

    return { message: 'Goal deleted successfully' };
  }

  async addSaving(userId: string, goalId: string, data: AddSavingDto) {
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      throw new NotFoundError('Goal not found');
    }

    if (goal.userId !== userId) {
      throw new ForbiddenError('Access denied');
    }

    // 트랜잭션으로 저축 기록 추가 및 목표 금액 업데이트
    const result = await prisma.$transaction(async (tx) => {
      // 저축 기록 추가
      const transaction = await tx.savingTransaction.create({
        data: {
          goalId,
          userId,
          amount: data.amount,
          note: data.note,
          transactionDate: data.transactionDate 
            ? new Date(data.transactionDate) 
            : new Date(),
        },
      });

      // 목표의 현재 금액 업데이트
      const newCurrentAmount = Number(goal.currentAmount) + data.amount;
      const updatedGoal = await tx.goal.update({
        where: { id: goalId },
        data: {
          currentAmount: newCurrentAmount,
          // 목표 달성 시 자동으로 완료 처리
          status: newCurrentAmount >= Number(goal.targetAmount) 
            ? 'completed' 
            : goal.status,
          completedAt: newCurrentAmount >= Number(goal.targetAmount) 
            ? new Date() 
            : goal.completedAt,
        },
      });

      return { transaction, goal: updatedGoal };
    });

    return result;
  }

  async getGoalProgress(userId: string, goalId: string) {
    const goal = await this.getGoalById(userId, goalId);

    const progressPercentage = Number(goal.currentAmount) / Number(goal.targetAmount) * 100;
    const remainingAmount = Number(goal.targetAmount) - Number(goal.currentAmount);
    const daysRemaining = Math.ceil(
      (new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      goal,
      progress: {
        percentage: Math.min(progressPercentage, 100).toFixed(2),
        currentAmount: Number(goal.currentAmount),
        targetAmount: Number(goal.targetAmount),
        remainingAmount: Math.max(remainingAmount, 0),
        daysRemaining: Math.max(daysRemaining, 0),
        isCompleted: goal.status === 'completed',
      },
    };
  }

  async getGoalStatistics(userId: string) {
    const [totalGoals, activeGoals, completedGoals, totalSaved] = await Promise.all([
      prisma.goal.count({ where: { userId } }),
      prisma.goal.count({ where: { userId, status: 'active' } }),
      prisma.goal.count({ where: { userId, status: 'completed' } }),
      prisma.savingTransaction.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalGoals,
      activeGoals,
      completedGoals,
      totalSaved: Number(totalSaved._sum.amount || 0),
    };
  }
}
