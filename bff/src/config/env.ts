import dotenv from "dotenv";

dotenv.config();

export const env = {
  NODE_ENV: process.env.NODE_ENV || "development",
  REST_PORT: Number(process.env.REST_PORT) || 4001,
  WS_PORT: Number(process.env.WS_PORT) || 4002,
  BACKEND_API_URL: process.env.BACKEND_API_URL || "http://localhost:4000/api",
  LOG_LEVEL: process.env.LOG_LEVEL || "info",
  WS_HEARTBEAT_INTERVAL: Number(process.env.WS_HEARTBEAT_INTERVAL) || 30000,
  WS_RECONNECT_DELAY: Number(process.env.WS_RECONNECT_DELAY) || 5000,
};
