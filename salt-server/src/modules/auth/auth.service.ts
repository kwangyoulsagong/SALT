import prisma from "../../config/database";
import { PasswordUtil } from "../../utils/password.util";
import { JwtUtil } from "../../utils/jwt.util";
import { ConflictError, UnauthorizedError } from "../../utils/error.util";
import { RegisterDto, LoginDto } from "./auth.dto";

export class AuthService {
  async register(data: RegisterDto) {
    // 이메일 중복 확인
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      throw new ConflictError("Email already exists");
    }

    // 비밀번호 해싱
    const passwordHash = await PasswordUtil.hash(data.password);

    // 사용자 생성
    const user = await prisma.user.create({
      data: {
        email: data.email,
        nickname: data.nickname,
        passwordHash,
      },
      select: {
        id: true,
        email: true,
        nickname: true,
        profileImageUrl: true,
        totalPoints: true,
        userLevel: true,
        createdAt: true,
      },
    });

    // JWT 토큰 생성
    const accessToken = JwtUtil.generateAccessToken(user.id, user.email);
    const refreshToken = JwtUtil.generateRefreshToken(user.id, user.email);

    return {
      user,
      accessToken,
      refreshToken,
    };
  }

  async login(data: LoginDto) {
    // 사용자 조회
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // 비밀번호 확인
    const isPasswordValid = await PasswordUtil.compare(
      data.password,
      user.passwordHash
    );

    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

    // 마지막 로그인 시간 업데이트
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // JWT 토큰 생성
    const accessToken = JwtUtil.generateAccessToken(user.id, user.email);
    const refreshToken = JwtUtil.generateRefreshToken(user.id, user.email);

    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profileImageUrl: user.profileImageUrl,
        totalPoints: user.totalPoints,
        userLevel: user.userLevel,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(refreshToken: string) {
    try {
      const decoded = JwtUtil.verifyRefreshToken(refreshToken);
      const accessToken = JwtUtil.generateAccessToken(
        decoded.userId,
        decoded.email
      );

      return { accessToken };
    } catch (error) {
      throw new UnauthorizedError("Invalid refresh token");
    }
  }

  async getMe(userId: string) {
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
      throw new UnauthorizedError("User not found");
    }

    return user;
  }
}
