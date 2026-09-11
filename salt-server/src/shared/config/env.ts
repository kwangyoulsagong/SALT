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
});

const parsedEnv = envSchema.parse(process.env);

export const env = {
  ...parsedEnv,
  JWT_EXPIRES_IN: parsedEnv.JWT_EXPIRES_IN as string | number,
  JWT_REFRESH_EXPIRES_IN: parsedEnv.JWT_REFRESH_EXPIRES_IN as string | number,
};
