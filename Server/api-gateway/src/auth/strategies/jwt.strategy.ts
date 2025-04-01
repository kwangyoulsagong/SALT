import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import type { Request } from 'express';
import { ConfigService } from '@nestjs/config';

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
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(
        'JWT_SECRET',
        'fallback-secret-key',
      ),
    });
  }

  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }
    return {
      id: payload.sub,
      email: payload.email,
      nickname: payload.nickname,
    };
  }
}
