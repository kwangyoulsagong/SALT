import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  REST_PORT: Number(process.env.REST_PORT) || 4001,
  WS_PORT: Number(process.env.WS_PORT) || 4002,
  BACKEND_API_URL: process.env.BACKEND_API_URL || "http://localhost:4000/api",
  /** Kotlin 서버(`salt-platform`, `BFF-REQ-045` FR-6). 라우팅 표가 `platform` · `shadow` 인 경로만 여기로 간다 */
  PLATFORM_API_URL: process.env.PLATFORM_API_URL || "http://localhost:4010/api",
  /** 라우팅 표 파일(FR-1) — 실행 위치(bff/) 기준. `src` 밖이라 dist 실행 · 이미지에도 같은 자리. 저장하면 재시작 없이 반영 */
  SERVER_ROUTES_FILE: process.env.SERVER_ROUTES_FILE || "config/server-routes.json",
  /** 그림자 요청 동시 상한 · 표본 비율(0~1). 넘치면 그 요청은 비교를 건너뛴다(BFF 응답에 영향 0) */
  SHADOW_MAX_IN_FLIGHT: Number(process.env.SHADOW_MAX_IN_FLIGHT) || 4,
  SHADOW_SAMPLE_RATE: process.env.SHADOW_SAMPLE_RATE === undefined ? 1 : Number(process.env.SHADOW_SAMPLE_RATE),
  /** 그림자 비교 기록 폴더(FR-4) */
  SHADOW_REPORT_DIR: process.env.SHADOW_REPORT_DIR || "var/shadow",
  /** 주면 서버 호출마다 골든 JSON 을 녹화한다(FR-2). 기본 꺼짐 */
  GOLDEN_RECORD_DIR: process.env.GOLDEN_RECORD_DIR || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  WS_HEARTBEAT_INTERVAL: Number(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
  WS_RECONNECT_DELAY: Number(process.env.WS_RECONNECT_DELAY) || 5000,
};
