import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

// Express의 Request 인터페이스 확장
interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

// 유저 정보 타입 정의
export interface UserPayload {
  id: string;
  email: string;
  nickname: string;
}

export const GetUser = createParamDecorator(
  (
    data: keyof UserPayload | undefined,
    ctx: ExecutionContext,
  ): UserPayload | UserPayload[keyof UserPayload] | undefined => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>(); // 확장된 Request 타입 사용
    const user = request.user; // user가 존재하지 않을 수도 있음

    if (!user) return undefined;

    // 특정 필드 요청 시 해당 값만 반환
    return data ? user[data] : user;
  },
);
