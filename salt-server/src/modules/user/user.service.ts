import prisma from '../../config/database';
import { NotFoundError, UnauthorizedError, ValidationError } from '../../utils/error.util';
import { PasswordUtil } from '../../utils/password.util';
import { 
  UpdateProfileDto, 
  ChangePasswordDto, 
  QueryPointTransactionsDto,
  QueryAchievementsDto 
} from './user.dto';

export class UserService {
  /**
   * 프로필 조회
   */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
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

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return user;
  }

  /**
   * 프로필 수정
   */
  async updateProfile(userId: string, data: UpdateProfileDto) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        nickname: data.nickname,
        profileImageUrl: data.profileImageUrl,
      },
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

    return user;
  }

  /**
   * 비밀번호 변경
   */
  async changePassword(userId: string, data: ChangePasswordDto) {
    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 현재 비밀번호 확인
    const isCurrentPasswordValid = await PasswordUtil.compare(
      data.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // 새 비밀번호 유효성 검사
    const validation = PasswordUtil.validate(data.newPassword);
    if (!validation.valid) {
      throw new ValidationError(validation.errors.join(', '));
    }

    // 비밀번호 업데이트
    const newPasswordHash = await PasswordUtil.hash(data.newPassword);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    return { message: 'Password changed successfully' };
  }

  /**
   * 포인트 내역 조회
   */
  async getPointTransactions(userId: string, query: QueryPointTransactionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.transactionType) where.transactionType = query.transactionType;
    if (query.source) where.source = query.source;
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(query.startDate);
      if (query.endDate) where.createdAt.lte = new Date(query.endDate);
    }

    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pointTransaction.count({ where }),
    ]);

    return {
      transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 포인트 통계
   */
  async getPointStats(userId: string) {
    const [earned, spent, totalTransactions] = await Promise.all([
      prisma.pointTransaction.aggregate({
        where: { userId, transactionType: 'earn' },
        _sum: { amount: true },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId, transactionType: 'spend' },
        _sum: { amount: true },
      }),
      prisma.pointTransaction.count({ where: { userId } }),
    ]);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { totalPoints: true },
    });

    return {
      currentPoints: user?.totalPoints || 0,
      totalEarned: earned._sum.amount || 0,
      totalSpent: spent._sum.amount || 0,
      totalTransactions,
    };
  }

  /**
   * 업적 조회
   */
  async getAchievements(userId: string, query: QueryAchievementsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.achievementType) where.achievementType = query.achievementType;

    const [achievements, total] = await Promise.all([
      prisma.userAchievement.findMany({
        where,
        skip,
        take: limit,
        orderBy: { earnedAt: 'desc' },
      }),
      prisma.userAchievement.count({ where }),
    ]);

    return {
      achievements,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 대시보드 요약 정보
   */
  async getDashboardSummary(userId: string) {
    const [
      user,
      activeGoals,
      completedGoals,
      totalSaved,
      watchlistCount,
      todayMissions,
      completedMissions,
      totalPoints,
    ] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          nickname: true,
          totalPoints: true,
          userLevel: true,
        },
      }),
      prisma.goal.count({
        where: { userId, status: 'active' },
      }),
      prisma.goal.count({
        where: { userId, status: 'completed' },
      }),
      prisma.savingTransaction.aggregate({
        where: { userId },
        _sum: { amount: true },
      }),
      prisma.investmentWatchlist.count({
        where: { userId },
      }),
      prisma.userMissionProgress.count({
        where: {
          userId,
          startedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      prisma.userMissionProgress.count({
        where: {
          userId,
          status: 'completed',
        },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId, transactionType: 'earn' },
        _sum: { amount: true },
      }),
    ]);

    return {
      user: {
        nickname: user?.nickname,
        totalPoints: user?.totalPoints || 0,
        level: user?.userLevel || 1,
      },
      goals: {
        active: activeGoals,
        completed: completedGoals,
        totalSaved: Number(totalSaved._sum.amount || 0),
      },
      investment: {
        watchlistCount,
      },
      missions: {
        todayCount: todayMissions,
        totalCompleted: completedMissions,
      },
      points: {
        total: totalPoints._sum.amount || 0,
      },
    };
  }

  /**
   * 계정 삭제
   */
  async deleteAccount(userId: string, password: string) {
    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 비밀번호 확인
    const isPasswordValid = await PasswordUtil.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      throw new UnauthorizedError('Password is incorrect');
    }

    // 계정 삭제 (Cascade로 연관 데이터 자동 삭제)
    await prisma.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }
}
