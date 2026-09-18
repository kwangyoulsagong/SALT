// `prisma.config.ts` 는 **`.env` 를 스스로 읽지 않는다.** 서버는 `dotenv` 로 읽지만
// Prisma CLI 는 이 파일을 먼저 로드하고, 그때 `DATABASE_URL` 이 없으면
// `npm run prisma:generate` 가 그대로 실패한다 — `validation.md` 가 게이트로 적어 둔
// 명령이 돌지 않는 상태였다. "실패하는 명령은 게이트가 아니다"(체크리스트 §6).
import "dotenv/config";

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
