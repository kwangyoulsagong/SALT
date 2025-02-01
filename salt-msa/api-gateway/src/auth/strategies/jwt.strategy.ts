// src/auth/strategies/jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import type { Request } from 'express';

// 같은 파일에 인터페이스 정의
type JwtFromRequestFunction = (req: Request) => string | null;

interface JwtStrategyOptions {
  jwtFromRequest: JwtFromRequestFunction;
  ignoreExpiration: boolean;
  secretOrKey: string;
}

interface JwtPayload {
  sub: string;
  email: string;
  nickname: string;
}

interface ValidatedUser {
  id: string;
  email: string;
  nickname: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy<typeof Strategy>(Strategy) {
  constructor() {
    const options: JwtStrategyOptions = {
      jwtFromRequest: (req: Request): string | null => {
        const authHeader = req.headers.authorization;
        return authHeader?.replace('Bearer ', '') ?? null;
      },
      ignoreExpiration: false,
      secretOrKey: 'your-secret-key',
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    super(options);
  }

  validate(payload: JwtPayload): ValidatedUser {
    return {
      id: payload.sub,
      email: payload.email,
      nickname: payload.nickname,
    };
  }
}
