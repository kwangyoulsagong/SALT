import prisma from '../../config/database';
import { NotFoundError, ConflictError, ValidationError } from '../../utils/error.util';
import { CreateMissionDto, UpdateMissionDto, QueryMissionsDto, QueryUserMissionsDto } from './mission.dto';

export class MissionService {
  /**
   * 미션 생성 (관리자용)
   */
  async createMission(data: CreateMissionDto) {
    const mission = await prisma.dailyMission.create({
      data: {
        title: data.title,
        description: data.description,
        missionType: data.missionType,
        pointsReward: data.pointsReward,
        difficulty: data.difficulty,
      },
    });

    return mission;
  }

  /**
   * 미션 목록 조회
   */
  async getMissions(query: QueryMissionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.missionType) where.missionType = query.missionType;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    const [missions, total] = await Promise.all([
      prisma.dailyMission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.dailyMission.count({ where }),
    ]);

    return {
      missions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 오늘의 미션 조회 (활성화된 미션)
   */
  async getTodayMissions(userId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // 활성화된 모든 미션 조회
    const allMissions = await prisma.dailyMission.findMany({
      where: { isActive: true },
      orderBy: [
        { difficulty: 'asc' },
        { pointsReward: 'desc' },
      ],
    });

    // 사용자의 오늘 진행 상황 조회
    const userProgress = await prisma.userMissionProgress.findMany({
      where: {
        userId,
        startedAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        mission: true,
      },
    });

    // 미션과 진행 상황 매칭
    const missionsWithProgress = allMissions.map((mission) => {
      const progress = userProgress.find((p) => p.missionId === mission.id);
      return {
        ...mission,
        userProgress: progress ? {
          id: progress.id,
          status: progress.status,
          startedAt: progress.startedAt,
          completedAt: progress.completedAt,
        } : null,
      };
    });

    return missionsWithProgress;
  }

  /**
   * 미션 시작
   */
  async startMission(userId: string, missionId: string) {
    // 미션 존재 확인
    const mission = await prisma.dailyMission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundError('Mission not found');
    }

    if (!mission.isActive) {
      throw new ValidationError('Mission is not active');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 오늘 이미 시작했는지 확인
    const existingProgress = await prisma.userMissionProgress.findFirst({
      where: {
        userId,
        missionId,
        startedAt: { gte: today },
      },
    });

    if (existingProgress) {
      throw new ConflictError('Mission already started today');
    }

    // 미션 진행 기록 생성
    const progress = await prisma.userMissionProgress.create({
      data: {
        userId,
        missionId,
        status: 'pending',
        startedAt: new Date(),
      },
      include: {
        mission: true,
      },
    });

    return progress;
  }

  /**
   * 미션 완료
   */
  async completeMission(userId: string, progressId: string) {
    // 진행 기록 조회
    const progress = await prisma.userMissionProgress.findUnique({
      where: { id: progressId },
      include: { mission: true },
    });

    if (!progress) {
      throw new NotFoundError('Mission progress not found');
    }

    if (progress.userId !== userId) {
      throw new NotFoundError('Mission progress not found');
    }

    if (progress.status !== 'pending') {
      throw new ValidationError('Mission already completed or failed');
    }

    // 트랜잭션으로 미션 완료 + 포인트 지급
    const result = await prisma.$transaction(async (tx) => {
      // 미션 완료 처리
      const updatedProgress = await tx.userMissionProgress.update({
        where: { id: progressId },
        data: {
          status: 'completed',
          completedAt: new Date(),
        },
        include: { mission: true },
      });

      // 포인트 지급
      await tx.pointTransaction.create({
        data: {
          userId,
          amount: progress.mission.pointsReward,
          transactionType: 'earn',
          source: 'mission',
          description: `Mission completed: ${progress.mission.title}`,
        },
      });

      // 사용자 총 포인트 업데이트
      await tx.user.update({
        where: { id: userId },
        data: {
          totalPoints: { increment: progress.mission.pointsReward },
        },
      });

      return updatedProgress;
    });

    return result;
  }

  /**
   * 사용자 미션 기록 조회
   */
  async getUserMissionHistory(userId: string, query: QueryUserMissionsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.status) where.status = query.status;
    if (query.startDate || query.endDate) {
      where.startedAt = {};
      if (query.startDate) where.startedAt.gte = new Date(query.startDate);
      if (query.endDate) where.startedAt.lte = new Date(query.endDate);
    }

    const [history, total] = await Promise.all([
      prisma.userMissionProgress.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startedAt: 'desc' },
        include: {
          mission: true,
        },
      }),
      prisma.userMissionProgress.count({ where }),
    ]);

    return {
      history,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 미션 통계
   */
  async getUserMissionStats(userId: string) {
    const [totalCompleted, totalPoints, todayCompleted] = await Promise.all([
      prisma.userMissionProgress.count({
        where: { userId, status: 'completed' },
      }),
      prisma.pointTransaction.aggregate({
        where: { userId, source: 'mission' },
        _sum: { amount: true },
      }),
      prisma.userMissionProgress.count({
        where: {
          userId,
          status: 'completed',
          completedAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);

    return {
      totalCompleted,
      totalPointsEarned: totalPoints._sum.amount || 0,
      todayCompleted,
    };
  }

  /**
   * 미션 수정 (관리자용)
   */
  async updateMission(missionId: string, data: UpdateMissionDto) {
    const mission = await prisma.dailyMission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundError('Mission not found');
    }

    const updated = await prisma.dailyMission.update({
      where: { id: missionId },
      data,
    });

    return updated;
  }

  /**
   * 미션 삭제 (관리자용)
   */
  async deleteMission(missionId: string) {
    const mission = await prisma.dailyMission.findUnique({
      where: { id: missionId },
    });

    if (!mission) {
      throw new NotFoundError('Mission not found');
    }

    await prisma.dailyMission.delete({
      where: { id: missionId },
    });

    return { message: 'Mission deleted successfully' };
  }
}
