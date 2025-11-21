import prisma from "../../config/database";
import { NotFoundError, ForbiddenError } from "../../utils/error.util";
import {
  CreateDrawingDto,
  UpdateDrawingDto,
  QueryDrawingsDto,
} from "./drawing.dto";

export class DrawingService {
  /**
   * 드로잉 생성
   */
  async createDrawing(userId: string, data: CreateDrawingDto) {
    const drawing = await prisma.chartDrawing.create({
      data: {
        userId,
        symbol: data.symbol.toUpperCase(),
        name: data.name,
        description: data.description,
        chartPeriod: data.chartPeriod,
        drawingData: data.drawingData as any,
        thumbnail: data.thumbnail,
        isPublic: data.isPublic,
      },
    });

    return drawing;
  }

  /**
   * 내 드로잉 목록 조회
   */
  async getMyDrawings(userId: string, query: QueryDrawingsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { userId };
    if (query.symbol) {
      where.symbol = query.symbol.toUpperCase();
    }

    const [drawings, total] = await Promise.all([
      prisma.chartDrawing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      prisma.chartDrawing.count({ where }),
    ]);

    return {
      drawings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 공개 드로잉 목록 조회 (커뮤니티)
   */
  async getPublicDrawings(query: QueryDrawingsDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = { isPublic: true };
    if (query.symbol) {
      where.symbol = query.symbol.toUpperCase();
    }

    const [drawings, total] = await Promise.all([
      prisma.chartDrawing.findMany({
        where,
        skip,
        take: limit,
        orderBy: { likeCount: "desc" },
        include: {
          user: {
            select: {
              id: true,
              nickname: true,
              profileImageUrl: true,
            },
          },
        },
      }),
      prisma.chartDrawing.count({ where }),
    ]);

    return {
      drawings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * 드로잉 상세 조회
   */
  async getDrawingById(drawingId: string, userId?: string) {
    const drawing = await prisma.chartDrawing.findUnique({
      where: { id: drawingId },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            profileImageUrl: true,
          },
        },
      },
    });

    if (!drawing) {
      throw new NotFoundError("Drawing not found");
    }

    // 비공개 드로잉은 본인만 조회 가능
    if (!drawing.isPublic && drawing.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    // 조회수 증가 (본인이 아닐 경우)
    if (drawing.userId !== userId) {
      await prisma.chartDrawing.update({
        where: { id: drawingId },
        data: { viewCount: { increment: 1 } },
      });
    }

    return drawing;
  }

  /**
   * 드로잉 수정
   */
  async updateDrawing(
    userId: string,
    drawingId: string,
    data: UpdateDrawingDto
  ) {
    const drawing = await prisma.chartDrawing.findUnique({
      where: { id: drawingId },
    });

    if (!drawing) {
      throw new NotFoundError("Drawing not found");
    }

    if (drawing.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    const updated = await prisma.chartDrawing.update({
      where: { id: drawingId },
      data: {
        name: data.name,
        description: data.description,
        drawingData: data.drawingData as any,
        thumbnail: data.thumbnail,
        isPublic: data.isPublic,
      },
    });

    return updated;
  }

  /**
   * 드로잉 삭제
   */
  async deleteDrawing(userId: string, drawingId: string) {
    const drawing = await prisma.chartDrawing.findUnique({
      where: { id: drawingId },
    });

    if (!drawing) {
      throw new NotFoundError("Drawing not found");
    }

    if (drawing.userId !== userId) {
      throw new ForbiddenError("Access denied");
    }

    await prisma.chartDrawing.delete({
      where: { id: drawingId },
    });

    return { message: "Drawing deleted successfully" };
  }

  /**
   * 드로잉 좋아요 (토글)
   */
  async toggleLike(drawingId: string) {
    // 간단 버전: 좋아요만 증가
    // 실제로는 user_drawing_likes 테이블 필요
    const drawing = await prisma.chartDrawing.update({
      where: { id: drawingId },
      data: {
        likeCount: { increment: 1 },
      },
    });

    return { likeCount: drawing.likeCount };
  }
}
