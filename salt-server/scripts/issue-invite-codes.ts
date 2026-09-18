/**
 * 초대 코드 발급 — **관리 화면을 만들지 않는 이유**가 여기 있다.
 *
 * 제품 정의가 본인 + 최대 10명이다(글로벌 플랜 1-1절). 10장을 위해 발급 화면·권한·감사
 * 로그를 만드는 것은 그 화면을 지키는 비용이 발급하는 비용보다 크다는 뜻이고,
 * `FEATURE-000` FR-23 이 "시드로 충분하다"고 정했다.
 *
 * ```bash
 * npx tsx scripts/issue-invite-codes.ts            # 3장, 30일 만료
 * npx tsx scripts/issue-invite-codes.ts 5 90       # 5장, 90일 만료
 * ```
 *
 * 출력된 코드는 **여기서만 볼 수 있다.** 다시 조회하는 경로를 만들지 않았다 — 코드를
 * 평문으로 다시 꺼낼 수 있으면 DB 접근이 곧 가입 권한이 된다.
 */
import { randomInt } from "node:crypto";

import prisma from "../src/shared/infrastructure/prisma";

/** 사람이 옮겨 적을 코드라 헷갈리는 글자(0·O·1·I·L)를 뺀다. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 8;
const DEFAULT_COUNT = 3;
const DEFAULT_EXPIRY_DAYS = 30;

const randomCode = (): string =>
  Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");

const main = async () => {
  const count = Number(process.argv[2] ?? DEFAULT_COUNT);
  const expiryDays = Number(process.argv[3] ?? DEFAULT_EXPIRY_DAYS);

  if (!Number.isInteger(count) || count < 1) {
    throw new Error("발급 장수는 1 이상의 정수여야 한다");
  }

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);
  const issued: string[] = [];

  // 코드 충돌은 확률이 낮지만 0 이 아니다. 유니크 제약이 잡아 주므로 재시도로 해결한다.
  while (issued.length < count) {
    const code = randomCode();
    try {
      await prisma.inviteCode.create({ data: { code, expiresAt } });
      issued.push(code);
    } catch {
      // 같은 코드가 이미 있다. 다시 뽑는다.
    }
  }

  const used = await prisma.inviteCode.count({ where: { usedByUserId: { not: null } } });
  const accounts = await prisma.user.count();

  console.log(`\n초대 코드 ${issued.length}장 (만료 ${expiresAt.toISOString()})\n`);
  for (const code of issued) console.log(`  ${code}`);
  console.log(`\n사용된 코드 ${used}장 · 현재 계정 ${accounts}명\n`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
