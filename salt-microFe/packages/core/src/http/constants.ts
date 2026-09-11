/**
 * 플랫폼 무관 HTTP 상수 (FE-REQ-007 FR-32).
 *
 * 두 zone과 RN이 같은 값을 본다. 앱 안에 복사본을 두지 않는다.
 */

export const NETWORK = {
  RETRY_COUNT: 2,
  TIMEOUT: 10000,
} as const;

export const HTTP_STATUS_CODE = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  CONTENT_TOO_LARGE: 413,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export const HTTP_ERROR_MESSAGE = {
  [HTTP_STATUS_CODE.NOT_FOUND]: {
    HEADING: "길을 잃었나요?",
    BODY: "요청하신 페이지를 찾을 수 없습니다.",
    BUTTON: "홈으로 가기",
  },
  [HTTP_STATUS_CODE.INTERNAL_SERVER_ERROR]: {
    HEADING: "현재 페이지를 표시할 수 없습니다.",
    BODY: `잠시 후 다시 시도해주세요.`,
    BUTTON: "새로고침",
  },
  [HTTP_STATUS_CODE.BAD_REQUEST]: {
    HEADING: "잘못된 요청입니다.",
    BODY: "확인 후 다시 시도해주세요.",
    BUTTON: "홈으로 가기",
  },
} as const;

/** 토스트용 에러 메시지 */
export const TOAST_MESSAGES = {
  409: "이미 존재하는 데이터입니다.",
  422: "입력 값을 확인해주세요.",
  403: "접근 권한이 없습니다.",
} as const;

export const ERROR_MESSAGE = "오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
