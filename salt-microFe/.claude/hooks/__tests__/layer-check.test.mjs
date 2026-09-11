#!/usr/bin/env node
/**
 * `layer-check` 훅의 위반 케이스 (`FE-REQ-009` 수용 기준 — 위반 8개로 테스트).
 *
 * 훅을 **실제로 실행**한다. 판정 함수를 부르는 것으로는 훅이 stdin 을 못 읽거나
 * exit code 를 잘못 내는 것을 못 잡는다.
 *
 * ```bash
 * node salt-microFe/.claude/hooks/__tests__/layer-check.test.mjs
 * ```
 */

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const HOOK = resolve(here, "../layer-check.mjs");
const APP = "/repo/salt-microFe/apps/web";

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

/** 막아야 하는 8가지. */
const BLOCKED = [
  {
    name: "1. 상위 레이어 import (entities → features)",
    file: `${APP}/src/entities/market/ui/PriceCell.tsx`,
    code: `import { useSignIn } from "@/features/sign-in";`,
    rule: "upper-layer",
  },
  {
    name: "2. cross-slice (entities → 다른 entities)",
    file: `${APP}/src/entities/invoice/ui/InvoiceRow.tsx`,
    code: `import { PriceCell } from "@/entities/market";`,
    rule: "cross-slice",
  },
  {
    name: "3. 슬라이스 내부 경로 직접 참조",
    file: `${APP}/src/widgets/market-board/ui/Board.tsx`,
    code: `import { MarketSort } from "@/entities/market/model/types";`,
    rule: "slice-internal",
  },
  {
    name: "4. shared 세그먼트 내부 경로 직접 참조",
    file: `${APP}/src/entities/market/ui/PriceCell.tsx`,
    code: `import { formatPrice } from "@/shared/lib/formatPrice";`,
    rule: "segment-internal",
  },
  {
    name: "5. zone 교차 (web-tax → web/src)",
    file: "/repo/salt-microFe/apps/web-tax/src/pages/tax/ui/TaxPage.tsx",
    code: `import { Layout } from "../../../../../web/src/shared/ui";`,
    rule: "cross-app",
  },
  {
    name: "6. RN↔웹 교차 (mobile → @repo/ui)",
    file: "/repo/salt-microFe/apps/mobile/src/shared/ui/Button.tsx",
    code: `import { Button } from "@repo/ui/button";`,
    rule: "rn-web-cross",
  },
  {
    name: "7. 루트 라우팅 파일에 re-export 외의 import",
    file: `${APP}/app/home/page.tsx`,
    code: `import { GoalSummary } from "@/entities/goal";\nexport default GoalSummary;`,
    rule: "routing-shell",
  },
  {
    name: "8. 레지스트리에 없는 슬라이스 생성",
    file: `${APP}/src/entities/crypto-wallet/model/types.ts`,
    code: `export interface Wallet { id: string }`,
    rule: "registry",
  },
];

/** 통과해야 하는 것 — 규칙이 과하게 막지 않는지 본다. */
const ALLOWED = [
  {
    name: "features → entities barrel",
    file: `${APP}/src/features/add-goal/ui/CategoryPicker.tsx`,
    code: `import { GOAL_CATEGORIES } from "@/entities/goal";`,
  },
  {
    name: "같은 슬라이스 내부는 상대 경로",
    file: `${APP}/src/entities/market/ui/MarketPreview/MarketPreview.tsx`,
    code: `import { PriceCell } from "../PriceCell";`,
  },
  {
    name: "vanilla-extract 토큰은 세그먼트 내부여도 허용",
    file: `${APP}/src/entities/goal/ui/GoalRow.css.ts`,
    code: `import { vars } from "@/shared/ui/tokens.css";`,
  },
  {
    name: "루트 라우팅 파일의 @/pages re-export",
    file: `${APP}/app/home/page.tsx`,
    code: `export { HomePage as default } from "@/pages/home";`,
  },
  {
    name: "검사 대상이 아닌 파일",
    file: "/repo/bff/src/routes/home.ts",
    code: `import { anything } from "@/widgets/whatever";`,
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
