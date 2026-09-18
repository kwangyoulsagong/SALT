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
    // `AppError.prototype` 로 고정하면 **모든 하위 클래스가 정체성을 잃는다** —
    // `new NotFoundError() instanceof NotFoundError` 가 false 였다. 미들웨어는
    // `statusCode` 만 보므로 응답은 맞았지만, 타입으로 거르는 코드는 전부 헛돈다.
    // `new.target` 은 실제로 생성된 클래스이고 `instanceof AppError` 도 그대로 참이다.
    Object.setPrototypeOf(this, new.target.prototype);
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

/**
 * 요청 제한 초과.
 *
 * **재시도 시각을 응답에 적지 않는다** — 창이 언제 열리는지 알려 주면 그 시각에
 * 맞춰 다시 때리는 것이 쉬워진다. 막는 것이 목적이다.
 */
export class TooManyRequestsError extends AppError {
  constructor(message: string = "Too Many Requests") {
    super(message, 429);
  }
}
