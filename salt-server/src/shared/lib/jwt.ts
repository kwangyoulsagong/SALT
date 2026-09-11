import jwt from "jsonwebtoken";
import { env } from "../config/env";

export interface JwtPayload {
  userId: string;
  email: string;
}

export class JwtUtil {
  static generateAccessToken(userId: string, email: string): string {
    // @ts-ignore
    return jwt.sign({ userId, email }, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN,
    });
  }

  static generateRefreshToken(userId: string, email: string): string {
    // @ts-ignore
    return jwt.sign({ userId, email }, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    });
  }

  static verifyAccessToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
  }

  static verifyRefreshToken(token: string): JwtPayload {
    return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
  }
}
