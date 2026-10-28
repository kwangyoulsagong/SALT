import winston from "winston";
import { env } from "./env";

/**
 * 둘째 인자 이후의 **문자열 · 숫자**를 본문에 붙인다.
 *
 * `logger.error("Upbit API error:", error.message)` 처럼 원인을 문자열로 넘기는 곳이 20곳 넘게 있는데
 * winston 은 객체가 아닌 추가 인자를 버린다 — 실패 원인이 로그에서 통째로 사라지고 있었다
 * (2026-10-28 확인). 객체 · Error 는 winston 이 이미 meta 로 합치므로 건드리지 않는다.
 */
export const appendExtraArgs = winston.format((info) => {
  const extra = (info as Record<symbol, unknown>)[Symbol.for("splat")];
  if (Array.isArray(extra)) {
    const texts = extra
      .filter((arg) => arg !== undefined && (arg === null || typeof arg !== "object"))
      .map(String);
    if (texts.length > 0) info.message = `${String(info.message)} ${texts.join(" ")}`;
  }
  return info;
});

const logFormat = winston.format.combine(
  appendExtraArgs(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ level, message, timestamp, ...meta }) => {
    let msg = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    return msg;
  })
);

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: logFormat,
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
  ],
});
