/**
 * 일봉 백필 — 마켓 목록의 6개월·1년 기간 변동률이 계산될 만큼 과거를 한 번 받는다.
 *
 * ```bash
 * npm run candles:backfill
 * ```
 *
 * 워커로 돌리지 않는 이유와 멱등성은 `BackfillDailyHistory` 주석에 있다. 다시 돌려도
 * 이미 받은 구간은 건너뛴다(가장 오래된 캔들 이전만 받는다).
 */
import { contextUseCases } from "../src/composition";
import prisma from "../src/shared/infrastructure/prisma";

const main = async () => {
  const result = await contextUseCases.market.backfillDailyHistory.execute();
  console.log(JSON.stringify(result));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
