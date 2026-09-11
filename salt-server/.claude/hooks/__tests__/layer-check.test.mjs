#!/usr/bin/env node
/**
 * `layer-check` 훅의 위반 케이스 (`SRV-REQ-006` 수용 기준 — 위반 6개로 테스트).
 *
 * 훅을 **실제로 실행**한다. 판정 함수를 부르는 것으로는 훅이 stdin 을 못 읽거나
 * exit code 를 잘못 내는 것을 못 잡는다.
 *
 * ```bash
 * npm run test:layer-check
 * ```
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(here, "../layer-check.mjs");
const SRC = "/repo/salt-server/src";

const run = (filePath, content) => {
  const result = spawnSync(process.execPath, [HOOK], {
    encoding: "utf8",
    input: JSON.stringify({
      tool_name: "Write",
      tool_input: { content, file_path: filePath },
    }),
  });
  return { status: result.status, stderr: result.stderr };
};

/** FR-11 이 막으라고 한 6종. */
const BLOCKED = [
  {
    name: "1. domain → application",
    file: `${SRC}/tax/domain/CostBasisLot.ts`,
    code: `import { SolveHarvest } from "../application/SolveHarvest";`,
    rule: "domain-to-application",
  },
  {
    name: "2. domain → @prisma/client",
    file: `${SRC}/ledger/domain/Transaction.ts`,
    code: `import { PrismaClient } from "@prisma/client";`,
    rule: "domain-framework",
  },
  {
    name: "3. domain → express · zod",
    file: `${SRC}/invoice/domain/Attribution.ts`,
    code: `import { z } from "zod";`,
    rule: "domain-framework",
  },
  {
    name: "4. application → infrastructure",
    file: `${SRC}/coach/application/RecommendAction.ts`,
    code: `import { PrismaScoreStore } from "../infrastructure/PrismaScoreStore";`,
    rule: "application-to-infrastructure",
  },
  {
    name: "5. presentation → infrastructure",
    file: `${SRC}/portfolio/presentation/portfolio.controller.ts`,
    code: `import { PrismaHoldingRepository } from "../infrastructure/PrismaHoldingRepository";`,
    rule: "presentation-to-infrastructure",
  },
  {
    name: "6. shared → 컨텍스트",
    file: `${SRC}/shared/presentation/errorMiddleware.ts`,
    code: `import { TaxError } from "../../tax/domain/TaxError";`,
    rule: "shared-to-context",
  },
  {
    name: "7. 컨텍스트 → 타 컨텍스트 내부 (application/api 아님)",
    file: `${SRC}/invoice/application/RecomputeSnapshot.ts`,
    code: `import { CostBasisLot } from "../../tax/domain/CostBasisLot";`,
    rule: "cross-context",
  },
  {
    name: "8. presentation → 타 컨텍스트 공개 API",
    file: `${SRC}/invoice/presentation/invoice.controller.ts`,
    code: `import type { CostBasisView } from "../../tax/application/api";`,
    rule: "presentation-cross-context",
  },
  {
    name: "9. 레지스트리에 없는 컨텍스트 생성",
    file: `${SRC}/crypto-wallet/domain/Wallet.ts`,
    code: `export interface Wallet { id: string }`,
    rule: "registry",
  },
  {
    name: "10. 조합 컨텍스트에 Aggregate",
    file: `${SRC}/homebriefing/domain/Briefing.ts`,
    code: `export class Briefing {}`,
    rule: "composite-domain",
  },
];

/** 통과해야 하는 것 — 규칙이 과하게 막지 않는지 본다. */
const ALLOWED = [
  {
    name: "application → domain",
    file: `${SRC}/tax/application/SolveHarvest.ts`,
    code: `import { CostBasisLot } from "../domain/CostBasisLot";`,
  },
  {
    name: "infrastructure → domain (Port 구현)",
    file: `${SRC}/tax/infrastructure/PrismaLotStore.ts`,
    code: `import { LotStore } from "../domain/LotStore";\nimport { PrismaClient } from "@prisma/client";`,
  },
  {
    name: "presentation → application",
    file: `${SRC}/tax/presentation/tax.controller.ts`,
    code: `import { SolveHarvest } from "../application/SolveHarvest";`,
  },
  {
    name: "application → 타 컨텍스트 공개 API",
    file: `${SRC}/invoice/application/RecomputeSnapshot.ts`,
    code: `import type { CostBasisView } from "../../tax/application/api";`,
  },
  {
    name: "컨텍스트 → shared",
    file: `${SRC}/tax/domain/TaxableGain.ts`,
    code: `import { Money } from "../../shared/domain/Money";\nimport Decimal from "decimal.js";`,
  },
  {
    name: "이관 전 모듈은 검사하지 않는다",
    file: `${SRC}/modules/portfolio/portfolio.service.ts`,
    code: `import prisma from "../../shared/infrastructure/prisma";`,
  },
];

let failed = 0;

for (const testCase of BLOCKED) {
  const { status, stderr } = run(testCase.file, testCase.code);
  const ok = status === 2 && stderr.includes(`[${testCase.rule}]`);
  if (!ok) {
    failed += 1;
    console.error(`✗ ${testCase.name}`);
    console.error(`   exit=${status} rule='${testCase.rule}' 기대와 다르다`);
    console.error(`   stderr: ${stderr.trim() || "(없음)"}`);
  } else {
    console.log(`✓ 차단 — ${testCase.name}`);
  }
}

for (const testCase of ALLOWED) {
  const { status, stderr } = run(testCase.file, testCase.code);
  if (status !== 0) {
    failed += 1;
    console.error(`✗ 통과해야 하는데 막혔다 — ${testCase.name}`);
    console.error(`   stderr: ${stderr.trim()}`);
  } else {
    console.log(`✓ 통과 — ${testCase.name}`);
  }
}

if (failed > 0) {
  console.error(`\n실패 ${failed}건`);
  process.exit(1);
}
console.log(`\n전부 통과 (차단 ${BLOCKED.length} · 통과 ${ALLOWED.length})`);
