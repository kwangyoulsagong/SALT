import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  REST_PORT: Number(process.env.REST_PORT) || 4001,
  WS_PORT: Number(process.env.WS_PORT) || 4002,
  BACKEND_API_URL: process.env.BACKEND_API_URL || "http://localhost:4000/api",
  /** Kotlin 서버(`salt-platform`, `BFF-REQ-045` FR-6). 라우팅 표가 `platform` · `shadow` 인 경로만 여기로 간다 */
  PLATFORM_API_URL: process.env.PLATFORM_API_URL || "http://localhost:4010/api",
  /** 라우팅 표 파일(FR-1) — 실행 위치(bff/) 기준. 저장하면 재시작 없이 반영 */
  SERVER_ROUTES_FILE: process.env.SERVER_ROUTES_FILE || "src/config/server-routes.json",
  /** 그림자 비교 기록 폴더(FR-4) */
  SHADOW_REPORT_DIR: process.env.SHADOW_REPORT_DIR || "var/shadow",
  /** 주면 서버 호출마다 골든 JSON 을 녹화한다(FR-2). 기본 꺼짐 */
  GOLDEN_RECORD_DIR: process.env.GOLDEN_RECORD_DIR || "",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  WS_HEARTBEAT_INTERVAL: Number(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
  WS_RECONNECT_DELAY: Number(process.env.WS_RECONNECT_DELAY) || 5000,
};
