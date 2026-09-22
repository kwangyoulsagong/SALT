import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

// Accept either GEMINI_API_KEY or GEMINI_FLASH for the Gemini key
if (!process.env.GEMINI_API_KEY && process.env.GEMINI_FLASH) {
  process.env.GEMINI_API_KEY = process.env.GEMINI_FLASH;
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.string().default("4000").transform(Number),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string(),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  LOG_LEVEL: z.string().default("info"),
  GEMINI_API_KEY: z.string().min(10),
  GEMINI_MODEL: z.string().default("gemini-2.5-flash-lite"),
  /**
   * 활성 계정 상한 (`SRV-REQ-008` FR-6 — **코드 상수 금지**).
   *
   * 제품 정의는 본인 + 최대 10명이다(글로벌 플랜 1-1절). 설정값인 이유는 상한이 찼을 때
   * 기존 계정을 지우는 것 말고 **늘리는 선택지**가 있어야 하기 때문이다.
   */
  INVITE_MAX_ACCOUNTS: z.coerce.number().int().positive().default(10),
  /**
   * 투자 화면 시장 요약 띠의 종목(쉼표 구분, 첫 심볼이 대표, 나머지는 화면에서 3줄씩 열) — `SRV-REQ-036`. **코드 상수 금지** —
   * 무엇을 요약할지는 화면 배포 없이 바꿀 수 있어야 한다.
   */
  MARKET_SUMMARY_SYMBOLS: z
    .string()
    .default("BTC,ETH,XRP,SOL,DOGE,ADA,TRX,SUI,AVAX,LINK")
    // 빈 칸 · 중복은 버리고 대문자로 맞춘다. 비면 기동을 막는다 — 요약할 것이 없는 설정은 오타다
    .transform((raw) =>
      Array.from(
        new Set(
          raw
            .split(",")
            .map((symbol) => symbol.trim().toUpperCase())
            .filter((symbol) => symbol !== "")
        )
      )
    )
    .pipe(z.array(z.string()).min(1)),
  /** 요약 태그 `wide_move` 임계(24시간 변동률 %, 절댓값) */
  MARKET_SUMMARY_WIDE_MOVE_RATE: z.coerce.number().positive().default(5),
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  JWT_EXPIRES_IN: parsedEnv.JWT_EXPIRES_IN as string | number,
  JWT_REFRESH_EXPIRES_IN: parsedEnv.JWT_REFRESH_EXPIRES_IN as string | number,
};
