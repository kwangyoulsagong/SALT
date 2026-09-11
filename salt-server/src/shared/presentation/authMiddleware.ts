/**
 * 인증 미들웨어.
 *
 * **왜 `auth` 컨텍스트가 아니라 여기 있는가.** 모든 컨텍스트의 라우터가 이것을 건다.
 * `auth/presentation` 에 두면 다른 컨텍스트의 `presentation` 이 남의 컨텍스트를 부르게 되고
 * 그건 규칙 위반이다(`server-architecture.md` §4).
 *
 * 여기 있는 것은 **토큰 전송 계층**이다 — 초대 코드 검증·세션 수명 같은 `auth` 도메인
 * 규칙은 들어오지 않는다. 그 경계가 흐려지면(예: 여기서 사용자 상태를 조회하기 시작하면)
 * 그때는 `auth/application/api` 를 부르는 조합 지점으로 옮겨야 한다.
 */
import { Request, Response, NextFunction } from "express";
import { JwtUtil, JwtPayload } from "../lib/jwt";
import { UnauthorizedError } from "./httpErrors";

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const authMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("No token provided");
    }

    const token = authHeader.split(" ")[1];
    const decoded = JwtUtil.verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (error: any) {
    if (error.name === "JsonWebTokenError") {
      next(new UnauthorizedError("Invalid token"));
    } else if (error.name === "TokenExpiredError") {
      next(new UnauthorizedError("Token expired"));
    } else {
      next(error);
    }
  }
};
