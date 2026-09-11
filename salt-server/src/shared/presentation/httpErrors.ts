/**
 * HTTP status 를 들고 있는 에러.
 *
 * > **이관 중 과도기다.** 새 코드는 `shared/domain` 의 `DomainError` 를 쓴다 —
 * > 도메인이 HTTP status 를 아는 것이 문제였고 그것을 고치는 것이 이 전환의 일부다
 * > (`ddd-shared.md` §2). 여기 있는 클래스들은 **아직 옮기지 않은 모듈**이 쓴다.
 * > 컨텍스트가 하나씩 옮겨질 때마다 사용처가 줄고, 마지막에 이 파일이 사라진다.
 */
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request") {
    super(message, 400);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, 401);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = "Not found") {
    super(message, 404);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
